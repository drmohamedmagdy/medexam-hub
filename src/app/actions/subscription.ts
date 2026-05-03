"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Plan } from "@/generated/prisma/client";

export async function cancelSubscriptionAction(): Promise<void> {
  const user = await requireUser();

  if (user.plan === Plan.FREE) return;

  const now = new Date();
  const hasActiveBilling = !!user.planExpiresAt && user.planExpiresAt > now;

  if (hasActiveBilling) {
    // Active paid period — mark cancellation, keep access until expiry, no auto-renew
    await prisma.user.update({
      where: { id: user.id },
      data: { planCancelledAt: now },
    });
  } else {
    // No active billing period (e.g. dev-upgrade or expired) — drop to Free immediately
    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: Plan.FREE,
        planStartedAt: null,
        planExpiresAt: null,
        planCancelledAt: null,
      },
    });
  }

  revalidatePath("/account/subscription");
  revalidatePath("/dashboard");
}

export async function reactivateSubscriptionAction(): Promise<void> {
  const user = await requireUser();
  if (!user.planCancelledAt) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { planCancelledAt: null },
  });

  revalidatePath("/account/subscription");
}
