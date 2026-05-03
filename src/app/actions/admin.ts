"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { Plan } from "@/generated/prisma/client";

const ChangePlanSchema = z.object({
  userId: z.string().min(1),
  plan: z.nativeEnum(Plan),
  daysFromNow: z.coerce.number().int().min(0).max(365 * 5).optional(),
});

export type AdminActionState = { error?: string; ok?: boolean } | null;

export async function adminChangePlanAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const parsed = ChangePlanSchema.safeParse({
    userId: formData.get("userId"),
    plan: formData.get("plan"),
    daysFromNow: formData.get("daysFromNow") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { userId, plan, daysFromNow } = parsed.data;
  const now = new Date();

  if (plan === Plan.FREE) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: Plan.FREE,
        planStartedAt: null,
        planExpiresAt: null,
        planCancelledAt: null,
      },
    });
  } else {
    const days = daysFromNow ?? 30;
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        planStartedAt: now,
        planExpiresAt: expiresAt,
        planCancelledAt: null,
      },
    });
  }

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { ok: true };
}

const ExtendSchema = z.object({
  userId: z.string().min(1),
  days: z.coerce.number().int().min(1).max(365),
});

export async function adminExtendExpiryAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const parsed = ExtendSchema.safeParse({
    userId: formData.get("userId"),
    days: formData.get("days"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { userId, days } = parsed.data;
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found" };

  const now = new Date();
  const base = target.planExpiresAt && target.planExpiresAt > now ? target.planExpiresAt : now;
  const newExpiresAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: { planExpiresAt: newExpiresAt },
  });

  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

const CancelSchema = z.object({ userId: z.string().min(1) });

export async function adminCancelSubscriptionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = CancelSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return;
  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { planCancelledAt: new Date() },
  });
  revalidatePath(`/admin/users/${parsed.data.userId}`);
}
