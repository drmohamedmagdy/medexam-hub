import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import {
  sendEmail,
  renewalReminderEmail,
  expiredEmail,
  reengagementEmail,
  communityDigestEmail,
} from "@/lib/email";

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
    reengagement: 0,
    communityDigest: 0,
    errors: 0,
  };

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

  return NextResponse.json({ ok: true, counts });
}
