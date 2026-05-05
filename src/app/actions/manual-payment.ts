"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import { validatePromoCode } from "@/lib/promo";
import { createNotification } from "@/lib/notifications";
import { PaymentStatus, type PaymentMethod } from "@/generated/prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// User-facing: submit a manual payment (Vodafone Cash / Instapay)
// ─────────────────────────────────────────────────────────────────────────────

export type ManualPayState =
  | { ok: true; orderId: string }
  | { ok: false; error: string }
  | null;

const SubmitSchema = z.object({
  plan: z.enum(["BASIC", "PRO", "PREMIUM"]),
  method: z.enum(["VODAFONE_CASH", "INSTAPAY"]),
  proofImageUrl: z.string().url(),
  proofImagePathname: z.string().min(1).max(500),
  proofNote: z.string().max(500).optional(),
  promoCode: z.string().max(40).optional(),
});

export async function submitManualPaymentAction(
  _prev: ManualPayState,
  formData: FormData
): Promise<ManualPayState> {
  const user = await requireUser();

  const parsed = SubmitSchema.safeParse({
    plan: formData.get("plan"),
    method: formData.get("method"),
    proofImageUrl: String(formData.get("proofImageUrl") ?? "").trim(),
    proofImagePathname: String(formData.get("proofImagePathname") ?? "").trim(),
    proofNote: String(formData.get("proofNote") ?? "").trim() || undefined,
    promoCode: String(formData.get("promoCode") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Please upload a clear screenshot of your transaction." };
  }

  const { plan, method, proofImageUrl, proofImagePathname, proofNote, promoCode } = parsed.data;
  const cfg = PLAN_LIMITS[plan];
  const originalCents = cfg.priceMonthly * 100;

  let amountCents = originalCents;
  let promoId: string | null = null;
  let promoCodeStored: string | null = null;

  if (promoCode) {
    const validation = await validatePromoCode({ code: promoCode, plan, userId: user.id });
    if (!validation.ok) {
      return { ok: false, error: validation.message };
    }
    amountCents = validation.finalCents;
    promoId = validation.promoId;
    promoCodeStored = validation.code;
  }

  // Block obvious spam: same user submitting more than 3 pending manual
  // payments for the same plan in the last 24 hours.
  const recentCount = await prisma.paymentOrder.count({
    where: {
      userId: user.id,
      plan,
      paymentMethod: method,
      status: PaymentStatus.PENDING,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recentCount >= 3) {
    return {
      ok: false,
      error: "You already have pending submissions for this plan. Wait for admin review or contact support.",
    };
  }

  const order = await prisma.paymentOrder.create({
    data: {
      userId: user.id,
      plan,
      amountCents,
      currency: "EGP",
      paymentMethod: method,
      status: PaymentStatus.PENDING,
      proofImageUrl,
      proofImagePathname,
      proofNote: proofNote ?? null,
      promoCodeId: promoId,
      promoCodeUsed: promoCodeStored,
      originalCents: promoId ? originalCents : null,
    },
  });

  if (promoId) {
    await prisma.promoRedemption.create({
      data: {
        promoCodeId: promoId,
        userId: user.id,
        plan,
        originalCents,
        finalCents: amountCents,
        paymentOrderId: order.id,
      },
    });
  }

  revalidatePath("/admin/payments");
  redirect(`/checkout/pending/${order.id}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin: approve / reject a manual payment
// ─────────────────────────────────────────────────────────────────────────────

const PLAN_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export async function adminApprovePaymentAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const order = await prisma.paymentOrder.findUnique({
    where: { id },
    include: { user: { select: { id: true, plan: true, planStartedAt: true, planExpiresAt: true } } },
  });
  if (!order) return;
  if (order.status === PaymentStatus.PAID) return;

  const now = new Date();
  const isRenewalSamePlan =
    order.user.plan === order.plan && order.user.planExpiresAt && order.user.planExpiresAt > now;
  const baseDate = isRenewalSamePlan ? order.user.planExpiresAt! : now;
  const expiresAt = new Date(baseDate.getTime() + PLAN_DURATION_MS);
  const startedAt = isRenewalSamePlan ? order.user.planStartedAt ?? now : now;

  await prisma.$transaction([
    prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: PaymentStatus.PAID,
        paidAt: now,
        reviewedAt: now,
        reviewedBy: admin.id,
        rejectionReason: null,
      },
    }),
    prisma.user.update({
      where: { id: order.userId },
      data: {
        plan: order.plan,
        planStartedAt: startedAt,
        planExpiresAt: expiresAt,
        planCancelledAt: null,
      },
    }),
  ]);

  await createNotification({
    userId: order.userId,
    category: "system",
    emoji: "✅",
    title: `Payment confirmed — you're on the ${PLAN_LIMITS[order.plan].label} plan`,
    body: `Your ${methodLabel(order.paymentMethod)} payment of ${(order.amountCents / 100).toLocaleString()} EGP has been verified. Your plan is active for 30 days.`,
    href: "/account/subscription",
  });

  revalidatePath("/admin/payments");
  revalidatePath(`/checkout/pending/${order.id}`);
}

export async function adminRejectPaymentAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const reason = String(formData.get("reason") ?? "").slice(0, 500) || "Couldn't verify your transaction reference.";

  const order = await prisma.paymentOrder.findUnique({ where: { id } });
  if (!order) return;
  if (order.status === PaymentStatus.PAID) return;

  await prisma.paymentOrder.update({
    where: { id: order.id },
    data: {
      status: PaymentStatus.FAILED,
      reviewedAt: new Date(),
      reviewedBy: admin.id,
      rejectionReason: reason,
    },
  });

  await createNotification({
    userId: order.userId,
    category: "system",
    emoji: "⚠️",
    title: "We couldn't verify your payment",
    body: `${reason} You can submit a new payment from the upgrade page or reply to this notification for help.`,
    href: `/checkout/${order.plan.toLowerCase()}`,
  });

  revalidatePath("/admin/payments");
  revalidatePath(`/checkout/pending/${order.id}`);
}

function methodLabel(m: PaymentMethod): string {
  if (m === "VODAFONE_CASH") return "Vodafone Cash";
  if (m === "INSTAPAY") return "Instapay";
  return "Card";
}
