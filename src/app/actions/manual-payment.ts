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
import {
  processReferralCommission,
  awardCredits,
  chargeCredits,
  maxCreditsForOrder,
} from "@/lib/credits";
import { PaymentStatus, type PaymentMethod } from "@/generated/prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// User-facing: submit a manual payment (Vodafone Cash / Instapay)
// ─────────────────────────────────────────────────────────────────────────────

export type ManualPayState =
  | { ok: true; orderId: string }
  | { ok: false; error: string }
  | null;

const SubmitSchema = z.object({
  plan: z.enum(["BASIC", "PRO", "PREMIUM", "RESEARCHER"]),
  method: z.enum(["VODAFONE_CASH", "INSTAPAY"]),
  proofImageUrl: z.string().url(),
  proofImagePathname: z.string().min(1).max(500),
  proofNote: z.string().max(500).optional(),
  promoCode: z.string().max(40).optional(),
  creditsToUse: z.coerce.number().int().min(0).max(100000).optional(),
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
    creditsToUse: formData.get("creditsToUse"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please upload a clear screenshot of your transaction." };
  }

  const { plan, method, proofImageUrl, proofImagePathname, proofNote, promoCode, creditsToUse } = parsed.data;
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

  // Validate + cap credit redemption against the post-promo amount.
  let creditsApplied = 0;
  if (creditsToUse && creditsToUse > 0) {
    const userCredits = await prisma.user.findUnique({
      where: { id: user.id },
      select: { creditsBalance: true },
    });
    const allowed = maxCreditsForOrder(amountCents, userCredits?.creditsBalance ?? 0);
    creditsApplied = Math.min(creditsToUse, allowed);
    amountCents -= creditsApplied * 100;
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
      originalCents: promoId || creditsApplied > 0 ? originalCents : null,
      creditsApplied,
    },
  });

  // Deduct credits AFTER the order exists, so the ledger row can reference it.
  // If admin rejects later, adminRejectPaymentAction refunds via awardCredits.
  if (creditsApplied > 0) {
    try {
      await chargeCredits({
        userId: user.id,
        amount: creditsApplied,
        type: "redemption_discount",
        description: `Discount on ${plan} order — ${creditsApplied} EGP off`,
        paymentOrderId: order.id,
      });
    } catch {
      // Race lost — someone else spent the credits in another tab. Roll back
      // by deleting the order and asking the user to retry.
      await prisma.paymentOrder.delete({ where: { id: order.id } });
      return {
        ok: false,
        error: "Couldn't lock your credits — your balance may have changed. Please try again.",
      };
    }
  }

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

  // Award referral commission to the referrer (idempotent + first-paid-only).
  await processReferralCommission(order.id);

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

  // Refund credits the user spent at checkout — they didn't actually get
  // anything. Awarding (positive) puts the credits back; the description
  // makes the ledger row easy to read.
  if (order.creditsApplied > 0) {
    await awardCredits({
      userId: order.userId,
      amount: order.creditsApplied,
      type: "redemption_refund",
      description: `Refund — payment for ${PLAN_LIMITS[order.plan].label} was rejected`,
      paymentOrderId: order.id,
    });
  }

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
