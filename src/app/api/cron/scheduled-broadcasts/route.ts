import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  sendTelegramMessage,
  isTelegramConfigured,
} from "@/lib/telegram";

/**
 * Hits 3x daily from vercel.json crons at 06:00 / 11:00 / 17:00 UTC
 * (= 09:00 / 14:00 / 20:00 Cairo). Drains any due ScheduledBroadcast
 * rows. Idempotent — sent rows are skipped on re-runs. Always returns
 * 200 so a partial failure doesn't break the schedule.
 *
 * Authorisation:
 *   - Vercel Cron sets Authorization: Bearer <CRON_SECRET> automatically
 *     when CRON_SECRET is configured in project env.
 *   - We accept that header OR no auth in development (no CRON_SECRET set).
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${expected}`) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  if (!isTelegramConfigured()) {
    return NextResponse.json({
      ok: true,
      skipped: "telegram not configured",
      sent: 0,
    });
  }

  const now = new Date();
  const due = await prisma.scheduledBroadcast.findMany({
    where: { sent: false, scheduledFor: { lte: now } },
    orderBy: { scheduledFor: "asc" },
    take: 20, // safety cap — we should only ever have 1-2 due per cron tick
  });

  if (due.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, note: "nothing due" });
  }

  let sentOk = 0;
  let failed = 0;
  const details: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const row of due) {
    const inlineButtons =
      row.ctaLabel && row.ctaUrl
        ? [{ text: row.ctaLabel, url: row.ctaUrl }]
        : undefined;

    const result = await sendTelegramMessage({
      text: row.text,
      photoUrl: row.imageUrl ?? undefined,
      parseMode: "HTML",
      disablePreview: !!row.imageUrl,
      inlineButtons,
    });

    const log = await prisma.broadcastLog.create({
      data: {
        kind: `scheduled_${row.kind}`,
        text: row.text,
        imageUrl: row.imageUrl,
        telegramMessageId: result.ok ? result.messageId : null,
        ok: result.ok,
        errorMessage: result.ok ? null : result.error,
      },
    });

    await prisma.scheduledBroadcast.update({
      where: { id: row.id },
      data: {
        sent: result.ok,
        sentAt: result.ok ? new Date() : null,
        errorMessage: result.ok ? null : result.error,
        broadcastLogId: log.id,
      },
    });

    if (result.ok) sentOk += 1;
    else failed += 1;
    details.push({ id: row.id, ok: result.ok, error: result.ok ? undefined : result.error });
  }

  return NextResponse.json({
    ok: true,
    sent: sentOk,
    failed,
    details,
  });
}
