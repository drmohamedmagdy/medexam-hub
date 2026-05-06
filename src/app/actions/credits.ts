"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { currentYearMonth } from "@/lib/plans";
import { redeemForBonusQuota } from "@/lib/credits";
import { createNotification } from "@/lib/notifications";

export type RedeemState = { ok?: boolean; error?: string } | null;

const Schema = z.object({
  kind: z.enum(["questions", "files"]),
  amount: z.coerce.number().int().min(1).max(500),
});

export async function redeemBonusQuotaAction(
  _prev: RedeemState,
  formData: FormData
): Promise<RedeemState> {
  const user = await requireUser();
  const parsed = Schema.safeParse({
    kind: formData.get("kind"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) {
    return { error: "Invalid request." };
  }

  try {
    await redeemForBonusQuota({
      userId: user.id,
      kind: parsed.data.kind,
      amount: parsed.data.amount,
      yearMonth: currentYearMonth(),
    });
  } catch (e) {
    return {
      error:
        e instanceof Error && e.message === "Insufficient credits"
          ? "Not enough credits for this redemption."
          : e instanceof Error
            ? e.message
            : "Couldn't redeem credits.",
    };
  }

  await createNotification({
    userId: user.id,
    category: "system",
    emoji: "🎁",
    title:
      parsed.data.kind === "questions"
        ? `+${parsed.data.amount} questions added`
        : `+${parsed.data.amount} file upload${parsed.data.amount === 1 ? "" : "s"} added`,
    body: "Your monthly quota has been topped up. The bonus expires when this month resets.",
    href: "/account/subscription",
  });

  revalidatePath("/account/subscription");
  revalidatePath("/exam/new");
  revalidatePath("/dashboard");
  return { ok: true };
}
