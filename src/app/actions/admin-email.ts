"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { PLAN_LIMITS } from "@/lib/plans";
import type { Plan } from "@/generated/prisma/client";

const SEGMENTS = ["ALL_OPTIN", "FREE", "BASIC", "PRO", "PREMIUM", "PAID", "INACTIVE"] as const;
type Segment = (typeof SEGMENTS)[number];

const Schema = z.object({
  segment: z.enum(SEGMENTS),
  subject: z.string().min(1).max(200),
  body: z.string().min(20).max(20000),
  dryRun: z.string().optional(),
});

export type BroadcastState =
  | { ok: true; dryRun: boolean; recipients: number; sent?: number }
  | { error: string }
  | null;

const DAY_MS = 24 * 60 * 60 * 1000;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function adminBroadcastAction(
  _prev: BroadcastState,
  formData: FormData
): Promise<BroadcastState> {
  await requireAdmin();
  const parsed = Schema.safeParse({
    segment: formData.get("segment"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    dryRun: formData.get("dryRun") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { segment, subject, body, dryRun } = parsed.data;
  const isDryRun = dryRun === "on";

  const where = await buildWhere(segment);
  const recipients = await prisma.user.findMany({
    where,
    select: { id: true, email: true, name: true, plan: true },
    take: 1000,
  });

  if (isDryRun) {
    return { ok: true, dryRun: true, recipients: recipients.length };
  }

  let sent = 0;
  for (const u of recipients) {
    const firstName = u.name?.split(" ")[0] ?? "there";
    const planLabel = PLAN_LIMITS[u.plan].label;
    const personalized = body
      .replaceAll("{firstName}", escapeHtml(firstName))
      .replaceAll("{name}", escapeHtml(u.name ?? u.email))
      .replaceAll("{email}", escapeHtml(u.email))
      .replaceAll("{planLabel}", escapeHtml(planLabel));
    const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;line-height:1.55;">${personalized}</div>`;
    const r = await sendEmail({
      toUserId: u.id,
      toEmail: u.email,
      subject,
      category: "broadcast",
      html,
    });
    if (r.ok) sent += 1;
  }

  revalidatePath("/admin/email");
  return { ok: true, dryRun: false, recipients: recipients.length, sent };
}

type WhereFilter = NonNullable<Parameters<typeof prisma.user.findMany>[0]>["where"];

async function buildWhere(segment: Segment): Promise<WhereFilter> {
  const base: WhereFilter = { emailMarketing: true };
  switch (segment) {
    case "ALL_OPTIN":
      return base;
    case "FREE":
      return { ...base, plan: "FREE" as Plan };
    case "BASIC":
      return { ...base, plan: "BASIC" as Plan };
    case "PRO":
      return { ...base, plan: "PRO" as Plan };
    case "PREMIUM":
      return { ...base, plan: "PREMIUM" as Plan };
    case "PAID":
      return { ...base, plan: { not: "FREE" as Plan } };
    case "INACTIVE": {
      const cutoff = new Date(Date.now() - 30 * DAY_MS);
      return {
        ...base,
        OR: [
          { sessions: { none: { createdAt: { gte: cutoff } } } },
          { exams: { none: { createdAt: { gte: cutoff } } } },
        ],
      };
    }
  }
}
