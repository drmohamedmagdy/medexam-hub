import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import {
  sendEmail,
  renewalReminderEmail,
  expiredEmail,
  expiredGrace1dEmail,
  expiredGrace7dEmail,
  reengagementEmail,
  communityDigestEmail,
  reviewReminderEmail,
} from "@/lib/email";
import type { Plan } from "@/generated/prisma/client";

/**
 * Daily cron triggered by Vercel Cron at 09:00 UTC (see vercel.json).
 *
 * Vercel signs cron requests with the CRON_SECRET env var; we verify the
 * Authorization header here. If you trigger this manually for testing, pass
 * `Authorization: Bearer <CRON_SECRET>`.
 *
 * Sends:
 *   - renewal-7d  : paid users whose plan expires in ~7 days
 *   - renewal-1d  : paid users whose plan expires in ~1 day
 *   - expired     : users whose plan just expired (in the last 24h)
 *   - reengagement: users on any plan who haven't generated an exam in 14 days
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  // Verify cron secret
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${expected}`) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const now = new Date();
  const counts = {
    renewal7d: 0,
    renewal1d: 0,
    expired: 0,
    downgraded: 0,
    grace1d: 0,
    grace7d: 0,
    reengagement: 0,
    communityDigest: 0,
    reviewReminder: 0,
    errors: 0,
  };

  // Helper: look up the last PAID plan a user had so the grace emails can
  // say "your BASIC plan" instead of "your former plan". Falls back to
  // BASIC if we can't find a record (shouldn't happen but defensive).
  async function lookupLastPaidPlan(userId: string): Promise<Plan> {
    const last = await prisma.paymentOrder.findFirst({
      where: { userId, status: "PAID", topupKind: null },
      orderBy: { paidAt: "desc" },
      select: { plan: true },
    });
    return last?.plan ?? "BASIC";
  }

  // -- 7-day reminder
  const window7Start = new Date(now.getTime() + 6 * DAY_MS);
  const window7End = new Date(now.getTime() + 7 * DAY_MS);
  const due7d = await prisma.user.findMany({
    where: {
      plan: { not: "FREE" },
      planCancelledAt: null,
      emailReminders: true,
      planExpiresAt: { gte: window7Start, lte: window7End },
    },
    select: { id: true, email: true, name: true, plan: true, planExpiresAt: true },
  });
  for (const u of due7d) {
    const tpl = renewalReminderEmail(u.name, u.id, PLAN_LIMITS[u.plan].label, 7, u.planExpiresAt!);
    const r = await sendEmail({ toUserId: u.id, toEmail: u.email, subject: tpl.subject, category: "renewal_7d", html: tpl.html });
    if (r.ok) {
      counts.renewal7d += 1;
      await prisma.user.update({ where: { id: u.id }, data: { lastReminderSentAt: now } });
    } else counts.errors += 1;
  }

  // -- 1-day reminder
  const window1Start = new Date(now.getTime() + 0 * DAY_MS);
  const window1End = new Date(now.getTime() + 1 * DAY_MS);
  const due1d = await prisma.user.findMany({
    where: {
      plan: { not: "FREE" },
      planCancelledAt: null,
      emailReminders: true,
      planExpiresAt: { gte: window1Start, lte: window1End },
    },
    select: { id: true, email: true, name: true, plan: true, planExpiresAt: true },
  });
  for (const u of due1d) {
    const tpl = renewalReminderEmail(u.name, u.id, PLAN_LIMITS[u.plan].label, 1, u.planExpiresAt!);
    const r = await sendEmail({ toUserId: u.id, toEmail: u.email, subject: tpl.subject, category: "renewal_1d", html: tpl.html });
    if (r.ok) {
      counts.renewal1d += 1;
      await prisma.user.update({ where: { id: u.id }, data: { lastReminderSentAt: now } });
    } else counts.errors += 1;
  }

  // -- Expired (within last 24 hours, plan still set to a paid tier)
  const expiredStart = new Date(now.getTime() - 1 * DAY_MS);
  const expiredEnd = now;
  const dueExpired = await prisma.user.findMany({
    where: {
      plan: { not: "FREE" },
      emailReminders: true,
      planExpiresAt: { gte: expiredStart, lte: expiredEnd },
    },
    select: { id: true, email: true, name: true, plan: true },
  });
  for (const u of dueExpired) {
    const tpl = expiredEmail(u.name, u.id, PLAN_LIMITS[u.plan].label);
    const r = await sendEmail({ toUserId: u.id, toEmail: u.email, subject: tpl.subject, category: "expired", html: tpl.html });
    if (r.ok) counts.expired += 1; else counts.errors += 1;
  }

  // -- Auto-downgrade expired paid plans to FREE.
  //
  // Without this, users keep full access after their plan ends — we'd
  // effectively be giving away the product. Runs AFTER the "expired"
  // email block above so the email still goes out with the right plan
  // label before we wipe it. planExpiresAt stays set (used below to find
  // grace-period candidates and surfaced in the UI as "last paid plan
  // ended on X").
  const downgrade = await prisma.user.updateMany({
    where: {
      plan: { not: "FREE" },
      planExpiresAt: { lt: now },
    },
    data: {
      plan: "FREE",
    },
  });
  counts.downgraded = downgrade.count;

  // -- Grace 1d: expired between 1-2 days ago. Catches users who missed
  //    the same-day "expired" email and might still want to renew quickly.
  const grace1Start = new Date(now.getTime() - 2 * DAY_MS);
  const grace1End = new Date(now.getTime() - 1 * DAY_MS);
  const grace1Candidates = await prisma.user.findMany({
    where: {
      plan: "FREE",
      emailReminders: true,
      planExpiresAt: { gte: grace1Start, lte: grace1End },
    },
    select: { id: true, email: true, name: true },
  });
  for (const u of grace1Candidates) {
    const lastPlan = await lookupLastPaidPlan(u.id);
    const tpl = expiredGrace1dEmail(u.name, u.id, PLAN_LIMITS[lastPlan].label);
    const r = await sendEmail({
      toUserId: u.id,
      toEmail: u.email,
      subject: tpl.subject,
      category: "expired_grace_1d",
      html: tpl.html,
    });
    if (r.ok) counts.grace1d += 1; else counts.errors += 1;
  }

  // -- Grace 7d: last chance. Expired 7-8 days ago, still hasn't renewed.
  //    After this we leave them alone — re-engagement covers longer dormancy.
  const grace7Start = new Date(now.getTime() - 8 * DAY_MS);
  const grace7End = new Date(now.getTime() - 7 * DAY_MS);
  const grace7Candidates = await prisma.user.findMany({
    where: {
      plan: "FREE",
      emailReminders: true,
      planExpiresAt: { gte: grace7Start, lte: grace7End },
    },
    select: { id: true, email: true, name: true },
  });
  for (const u of grace7Candidates) {
    const lastPlan = await lookupLastPaidPlan(u.id);
    const tpl = expiredGrace7dEmail(u.name, u.id, PLAN_LIMITS[lastPlan].label);
    const r = await sendEmail({
      toUserId: u.id,
      toEmail: u.email,
      subject: tpl.subject,
      category: "expired_grace_7d",
      html: tpl.html,
    });
    if (r.ok) counts.grace7d += 1; else counts.errors += 1;
  }

  // -- Re-engagement: signed up >14 days ago, no exam in last 14 days,
  //    no re-engagement email in the last 30 days, opted-in to marketing.
  const fourteenDaysAgo = new Date(now.getTime() - 14 * DAY_MS);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
  const candidates = await prisma.user.findMany({
    where: {
      emailMarketing: true,
      createdAt: { lte: fourteenDaysAgo },
      OR: [{ lastReengagementAt: null }, { lastReengagementAt: { lte: thirtyDaysAgo } }],
    },
    select: {
      id: true, email: true, name: true,
      _count: { select: { exams: { where: { createdAt: { gte: fourteenDaysAgo } } } } },
      exams: {
        where: { status: "COMPLETED" },
        select: { id: true },
      },
    },
    take: 200, // safety cap per cron tick
  });
  for (const u of candidates) {
    if (u._count.exams > 0) continue; // active recently
    if (u.exams.length === 0) continue; // never completed an exam — different lifecycle
    const tpl = reengagementEmail(u.name, u.id, u.exams.length);
    const r = await sendEmail({ toUserId: u.id, toEmail: u.email, subject: tpl.subject, category: "reengagement", html: tpl.html });
    if (r.ok) {
      counts.reengagement += 1;
      await prisma.user.update({ where: { id: u.id }, data: { lastReengagementAt: now } });
    } else counts.errors += 1;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Community digest — fan out a single email per opted-in user with new
  // public posts since their last digest. We mark each post's digestSentAt
  // after the run so we don't re-send the same posts the next day.
  // ─────────────────────────────────────────────────────────────────────────

  const oneDayAgo = new Date(now.getTime() - DAY_MS);
  const newPosts = await prisma.post.findMany({
    where: {
      groupId: null, // public feed only
      digestSentAt: null,
      createdAt: { gte: oneDayAgo },
    },
    orderBy: { createdAt: "asc" },
    take: 50, // safety cap
    include: { author: { select: { name: true, email: true } } },
  });

  if (newPosts.length > 0) {
    const recipients = await prisma.user.findMany({
      where: { emailMarketing: true, emailVerifiedAt: { not: null } },
      select: { id: true, email: true, name: true },
      take: 1000,
    });

    const baseUrl = process.env.PUBLIC_BASE_URL ?? "https://medexamhub.org";
    const digestPosts = newPosts.map((p) => ({
      id: p.id,
      title: p.title,
      body: p.body,
      kind: p.kind,
      authorName: p.author.name?.trim() || p.author.email.split("@")[0],
    }));

    for (const u of recipients) {
      // Skip authors of the digest posts so people don't get a digest of
      // their own content.
      const ownPostIds = new Set(newPosts.filter((p) => p.author.email === u.email).map((p) => p.id));
      const visible = digestPosts.filter((p) => !ownPostIds.has(p.id));
      if (visible.length === 0) continue;

      const tpl = communityDigestEmail({
        firstName: u.name?.split(" ")[0] ?? null,
        posts: visible.slice(0, 6), // cap items per email
        baseUrl,
      });
      const r = await sendEmail({
        toUserId: u.id,
        toEmail: u.email,
        subject: tpl.subject,
        category: "community_digest",
        html: tpl.html,
      });
      if (r.ok) counts.communityDigest += 1;
      else counts.errors += 1;
    }

    await prisma.post.updateMany({
      where: { id: { in: newPosts.map((p) => p.id) } },
      data: { digestSentAt: now },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Review-due reminders — daily nudge for users with cards waiting in
  // /review. Aggregate per-user counts in one query, then per-user
  // specialty breakdown so the email can list the top areas to clear.
  // ─────────────────────────────────────────────────────────────────────────
  const dayBefore = new Date(now.getTime() - DAY_MS);
  const dueGroups = await prisma.reviewCard.groupBy({
    by: ["userId"],
    where: { due: { lte: now } },
    _count: { _all: true },
  });
  if (dueGroups.length > 0) {
    const candidateUserIds = dueGroups.map((g) => g.userId);
    const reviewRecipients = await prisma.user.findMany({
      where: {
        id: { in: candidateUserIds },
        emailReminders: true,
        emailVerifiedAt: { not: null },
        OR: [
          { lastReviewReminderAt: null },
          { lastReviewReminderAt: { lt: dayBefore } },
        ],
      },
      select: { id: true, email: true, name: true },
    });
    const dueCountById = new Map(
      dueGroups.map((g) => [g.userId, g._count._all] as const)
    );
    for (const u of reviewRecipients) {
      const dueCount = dueCountById.get(u.id) ?? 0;
      if (dueCount === 0) continue;
      // Pull the user's top specialties for the email body. One query per
      // user, but bounded by the cap of recipients above.
      const specialtyRows = await prisma.reviewCard.findMany({
        where: { userId: u.id, due: { lte: now } },
        select: {
          question: { select: { exam: { select: { specialty: true } } } },
        },
        take: 200,
      });
      const buckets = new Map<string, number>();
      for (const r of specialtyRows) {
        const s = r.question.exam.specialty?.trim() || "Unspecified";
        buckets.set(s, (buckets.get(s) ?? 0) + 1);
      }
      const top = Array.from(buckets.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([specialty, count]) => ({ specialty, count }));
      const tpl = reviewReminderEmail(u.name, u.id, dueCount, top);
      const r = await sendEmail({
        toUserId: u.id,
        toEmail: u.email,
        subject: tpl.subject,
        category: "review_reminder",
        html: tpl.html,
      });
      if (r.ok) {
        counts.reviewReminder += 1;
        await prisma.user.update({
          where: { id: u.id },
          data: { lastReviewReminderAt: now },
        });
      } else counts.errors += 1;
    }
  }

  return NextResponse.json({ ok: true, counts });
}
