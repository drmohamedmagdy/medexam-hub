"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

export async function adminCancelSubscriptionAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const parsed = CancelSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return { error: "Invalid request" };

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return { error: "User not found" };

  if (target.plan === Plan.FREE) {
    return { error: "User is already on the Free plan." };
  }

  const now = new Date();
  const hasActiveBilling = !!target.planExpiresAt && target.planExpiresAt > now;

  if (hasActiveBilling) {
    // They still have paid time left — mark cancellation, no auto-renew.
    await prisma.user.update({
      where: { id: target.id },
      data: { planCancelledAt: now },
    });
  } else {
    // No active billing period (dev-upgrade or already expired) — drop to Free immediately.
    await prisma.user.update({
      where: { id: target.id },
      data: {
        plan: Plan.FREE,
        planStartedAt: null,
        planExpiresAt: null,
        planCancelledAt: null,
      },
    });
  }

  revalidatePath(`/admin/users/${target.id}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { ok: true };
}

const DeleteUserSchema = z.object({
  userId: z.string().min(1),
  confirmEmail: z.string().min(1),
});

export async function adminDeleteUserAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const parsed = DeleteUserSchema.safeParse({
    userId: formData.get("userId"),
    confirmEmail: formData.get("confirmEmail"),
  });
  if (!parsed.success) return { error: "Missing fields." };

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return { error: "User not found." };

  if (target.id === admin.id) {
    return { error: "You can't delete your own admin account." };
  }

  const expectedEmail = target.email.toLowerCase();
  const providedEmail = parsed.data.confirmEmail.trim().toLowerCase();
  if (providedEmail !== expectedEmail) {
    return {
      error: `Confirmation didn't match. Type the user's email exactly: ${target.email}`,
    };
  }

  // Cascade deletes (configured in schema): exams, questions, sessions, payments,
  // usage logs, file uploads. The user row + all owned data is removed.
  await prisma.user.delete({ where: { id: target.id } });

  revalidatePath("/admin/users");
  revalidatePath("/admin");

  // Server-side redirect is the most reliable way to navigate away from a now-404
  // detail page. Throws NEXT_REDIRECT (typed as never), so this function never
  // actually returns AdminActionState in the success path.
  redirect("/admin/users");
}
