"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { sendTelegramMessage, isTelegramConfigured } from "@/lib/telegram";

const Schema = z.object({
  text: z.string().min(2).max(3800).trim(),
  imageUrl: z.string().url().max(500).optional().or(z.literal("")),
  ctaLabel: z.string().max(64).optional().or(z.literal("")),
  ctaUrl: z.string().url().max(500).optional().or(z.literal("")),
});

export type BroadcastState =
  | { ok: true; messageId: number }
  | { ok: false; error: string }
  | null;

export async function sendBroadcastAction(
  _prev: BroadcastState,
  formData: FormData
): Promise<BroadcastState> {
  const admin = await requireAdmin();

  if (!isTelegramConfigured()) {
    return {
      ok: false,
      error:
        "Telegram is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID in Vercel and redeploy.",
    };
  }

  const parsed = Schema.safeParse({
    text: formData.get("text"),
    imageUrl: String(formData.get("imageUrl") ?? "").trim(),
    ctaLabel: String(formData.get("ctaLabel") ?? "").trim(),
    ctaUrl: String(formData.get("ctaUrl") ?? "").trim(),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const inlineButtons =
    parsed.data.ctaLabel && parsed.data.ctaUrl
      ? [{ text: parsed.data.ctaLabel, url: parsed.data.ctaUrl }]
      : undefined;

  const result = await sendTelegramMessage({
    text: parsed.data.text,
    photoUrl: parsed.data.imageUrl || undefined,
    parseMode: "HTML",
    disablePreview: !!parsed.data.imageUrl,
    inlineButtons,
  });

  await prisma.broadcastLog.create({
    data: {
      kind: "admin_manual",
      text: parsed.data.text,
      imageUrl: parsed.data.imageUrl || null,
      telegramMessageId: result.ok ? result.messageId : null,
      ok: result.ok,
      errorMessage: result.ok ? null : result.error,
      sentBy: admin.id,
    },
  });

  revalidatePath("/admin/broadcast");

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, messageId: result.messageId };
}
