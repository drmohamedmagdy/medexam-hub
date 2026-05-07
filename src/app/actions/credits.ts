"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { currentYearMonth } from "@/lib/plans";
import { redeemForBonusQuota } from "@/lib/credits";
import { createNotification } from "@/lib/notifications";

export type RedeemState = { ok?: boolean; error?: string } | null;

const Schema = z.object({
  kind: z.enum(["questions", "files", "research_projects", "stats_analyses"]),
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

  const titleByKind: Record<typeof parsed.data.kind, string> = {
    questions: `+${parsed.data.amount} bonus question${parsed.data.amount === 1 ? "" : "s"} added`,
    files: `+${parsed.data.amount} bonus file upload${parsed.data.amount === 1 ? "" : "s"} added`,
    research_projects: `+${parsed.data.amount} bonus research project${parsed.data.amount === 1 ? "" : "s"} added`,
    stats_analyses: `+${parsed.data.amount} bonus statistical analys${parsed.data.amount === 1 ? "is" : "es"} added`,
  };
  await createNotification({
    userId: user.id,
    category: "system",
    emoji: "🎁",
    title: titleByKind[parsed.data.kind],
    body: "Your bonus pool grew. It never expires — use it whenever your monthly plan quota runs out.",
    href: "/account/subscription",
  });

  revalidatePath("/account/subscription");
  revalidatePath("/exam/new");
  revalidatePath("/dashboard");
  revalidatePath("/research");
  revalidatePath("/statistics");
  return { ok: true };
}
