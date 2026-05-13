import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookHmac } from "@/lib/paymob-intention";
import { PaymentStatus, type PaymentMethod } from "@/generated/prisma/client";
import { createNotification } from "@/lib/notifications";
import { PLAN_LIMITS } from "@/lib/plans";
import { processReferralCommission } from "@/lib/credits";
import { topupByKind } from "@/lib/topups";
import { paymentReceiptEmail, sendEmail } from "@/lib/email";

/**
 * Paymob calls this endpoint when a transaction has been processed.
 * The body is the full Transaction object; the HMAC signature is passed
 * as a query parameter `?hmac=...`.
 *
 * Required dashboard config: set both "Transaction Processed callback"
 * and "Transaction Response callback" on every Payment Integration to
 *   https://medexamhub.org/api/payments/paymob/webhook
 *
 * We:
 *   1. Verify HMAC against the body — anyone could POST otherwise.
 *   2. Match the transaction back to our PaymentOrder via
 *      `extras.external_order_id` (set when we created the intention).
 *   3. If success=true and order is PENDING: mark PAID, extend plan
 *      or grant top-up, notify the user, award referral commission.
 *   4. If success=false: mark FAILED, notify user.
 *   5. Always return 200 so Paymob doesn't retry endlessly.
 */

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function yearMonthOf(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function methodLabel(m: PaymentMethod): string {
  if (m === "CARD") return "card";
  if (m === "VODAFONE_CASH") return "Vodafone Cash";
  if (m === "INSTAPAY") return "Instapay";
  return "online";
}

export async function POST(req: NextRequest) {
  const url = req.nextUrl;
  const hmac = url.searchParams.get("hmac") ?? "";

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    console.warn("[paymob-webhook] invalid JSON body");
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  // Aggressive logging — most LIVE orders are getting stuck PENDING which
  // means either Paymob isn't reaching us at all, or our HMAC check is
  // rejecting them. Logging every inbound call lets us see in Vercel logs
  // what actually arrived and why we did or didn't accept it.
  console.log("[paymob-webhook] received", {
    type: body.type,
    hasObj: typeof body.obj === "object",
    hmacLen: hmac.length,
    keys: Object.keys(body).slice(0, 12),
  });

  // The "obj" envelope is Paymob's standard for callback bodies — older
  // dashboards send the transaction directly; newer ones nest it. We
  // normalise here so verifyWebhookHmac sees the right shape.
  const txn = (body.obj as Record<string, unknown>) ?? body;

  // Paymob sends different callback types to the same endpoint (TRANSACTION,
  // SUBSCRIPTION, etc.). We only handle TRANSACTION here — ack anything
  // else with 200 so they stop retrying but don't run plan side-effects.
  if (typeof body.type === "string" && body.type !== "TRANSACTION") {
    console.log("[paymob-webhook] ignored non-TRANSACTION type", body.type);
    return Response.json({ ok: true, note: `ignored type=${body.type}` });
  }

  // 3DS-pending transactions arrive with success=false, pending=true. The
  // "final" callback comes after the user completes 3DS. Don't mark FAILED
  // on the pending one — wait for the real verdict.
  if (txn.pending === true) {
    console.log("[paymob-webhook] pending intermediate callback", { txnId: txn.id });
    return Response.json({ ok: true, note: "pending — waiting for final callback" });
  }

  if (!verifyWebhookHmac(txn, hmac)) {
    // Fail closed — log and reject. We DON'T mark anything as paid on
    // an unverified callback; a forged request would unlock plans. Log
    // every field that goes into the HMAC so we can spot what's different
    // (Paymob may have changed the canonical field order).
    const extras = (txn.extras as Record<string, unknown>) ?? {};
    const ord = (txn.order as Record<string, unknown>) ?? {};
    console.warn("[paymob-webhook] HMAC verification failed", {
      txnId: txn.id,
      txnSuccess: txn.success,
      receivedHmac: hmac ? `${hmac.slice(0, 8)}…${hmac.slice(-4)}` : "(none)",
      hmacLen: hmac.length,
      externalOrderId:
        (typeof extras.external_order_id === "string" && extras.external_order_id) ||
        (typeof ord.merchant_order_id === "string" && ord.merchant_order_id) ||
        null,
      hmacSecretConfigured: Boolean(process.env.PAYMOB_HMAC_SECRET),
      hmacSecretLen: process.env.PAYMOB_HMAC_SECRET?.length ?? 0,
    });
    // Return 200 (not 401) so Paymob doesn't blacklist our endpoint
    // for repeated failures. We still don't mutate state.
    return Response.json({ ok: false, error: "invalid hmac" });
  }
  console.log("[paymob-webhook] HMAC verified", { txnId: txn.id, success: txn.success });

  const success = Boolean(txn.success);
  const extras = (txn.extras as Record<string, unknown>) ?? {};
  // Two ways Paymob can echo our order id: `extras.external_order_id`
  // (what we set on the intention) or `order.merchant_order_id` (some
  // legacy paths). Try both.
  const order = (txn.order as Record<string, unknown>) ?? {};
  const externalOrderId =
    (typeof extras.external_order_id === "string" && extras.external_order_id) ||
    (typeof order.merchant_order_id === "string" && order.merchant_order_id) ||
    null;

  if (!externalOrderId) {
    console.warn("[paymob-webhook] no external order id in callback", {
      txnId: txn.id,
    });
    return Response.json({ ok: false, error: "no order id" }, { status: 400 });
  }

  const paymentOrder = await prisma.paymentOrder.findUnique({
    where: { id: externalOrderId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          planStartedAt: true,
          planExpiresAt: true,
        },
      },
    },
  });
  if (!paymentOrder) {
    // Probably a stale callback for an order we no longer have. Ack
    // with 200 so Paymob stops retrying.
    console.warn(
      "[paymob-webhook] payment order not found",
      externalOrderId
    );
    return Response.json({ ok: true, note: "order not found" });
  }

  // Idempotency — if we already marked PAID, don't run side effects again.
  if (paymentOrder.status === PaymentStatus.PAID) {
    return Response.json({ ok: true, note: "already paid" });
  }

  const paymobOrderId = String(order.id ?? "");
  const paymobTxId = String(txn.id ?? "");
  const now = new Date();

  if (!success) {
    await prisma.paymentOrder.update({
      where: { id: paymentOrder.id },
      data: {
        status: PaymentStatus.FAILED,
        paymobOrderId: paymobOrderId || null,
        paymobTxId: paymobTxId || null,
        rejectionReason: typeof txn.data === "object" && txn.data
          ? JSON.stringify(txn.data).slice(0, 280)
          : "Payment declined",
      },
    });
    await createNotification({
      userId: paymentOrder.userId,
      category: "system",
      emoji: "⚠️",
      title: "Payment failed",
      body: `Your ${methodLabel(paymentOrder.paymentMethod)} payment of ${(paymentOrder.amountCents / 100).toLocaleString()} EGP didn't go through. Try again or contact support.`,
      href: "/plans",
    });
    return Response.json({ ok: true, note: "marked failed" });
  }

  // Success path: same effects as adminApprovePaymentAction, minus
  // admin auth. Top-ups grant bonus pool; plan purchases extend the
  // user's plan window.
  if (paymentOrder.topupKind) {
    const product = topupByKind(paymentOrder.topupKind);
    if (!product) {
      // Unknown topupKind on a paid order — record paid but warn so
      // the team can investigate; don't grant unknown pool.
      console.error(
        "[paymob-webhook] unknown topupKind on paid order",
        paymentOrder.id,
        paymentOrder.topupKind
      );
      await prisma.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: now,
          paymobOrderId: paymobOrderId || null,
          paymobTxId: paymobTxId || null,
        },
      });
      return Response.json({ ok: true, note: "paid but unknown topupKind" });
    }
    const grantAmount = paymentOrder.topupAmount ?? product.amount;
    await prisma.$transaction([
      prisma.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: now,
          paymobOrderId: paymobOrderId || null,
          paymobTxId: paymobTxId || null,
        },
      }),
      prisma.bonusGrant.create({
        data: {
          userId: paymentOrder.userId,
          kind: product.bonusKind,
          amount: grantAmount,
          creditsSpent: 0,
          yearMonth: yearMonthOf(now),
        },
      }),
    ]);
    await createNotification({
      userId: paymentOrder.userId,
      category: "system",
      emoji: "🎁",
      title: `Top-up confirmed — ${product.label}`,
      body: `Your ${methodLabel(paymentOrder.paymentMethod)} payment of ${(paymentOrder.amountCents / 100).toLocaleString()} EGP was verified. You can use it now — the top-up never expires.`,
      href: "/research",
    });
    return Response.json({ ok: true, note: "topup granted" });
  }

  // Plan purchase / renewal. Duration is whatever the customer paid for
  // (1, 3, 6, or 12 months); we multiply 30 days × N to extend the window.
  const isRenewalSamePlan =
    paymentOrder.user.plan === paymentOrder.plan &&
    paymentOrder.user.planExpiresAt &&
    paymentOrder.user.planExpiresAt > now;
  const baseDate = isRenewalSamePlan
    ? paymentOrder.user.planExpiresAt!
    : now;
  const months = paymentOrder.durationMonths || 1;
  const expiresAt = new Date(baseDate.getTime() + months * ONE_MONTH_MS);
  const startedAt = isRenewalSamePlan
    ? paymentOrder.user.planStartedAt ?? now
    : now;

  await prisma.$transaction([
    prisma.paymentOrder.update({
      where: { id: paymentOrder.id },
      data: {
        status: PaymentStatus.PAID,
        paidAt: now,
        paymobOrderId: paymobOrderId || null,
        paymobTxId: paymobTxId || null,
      },
    }),
    prisma.user.update({
      where: { id: paymentOrder.userId },
      data: {
        plan: paymentOrder.plan,
        planStartedAt: startedAt,
        planExpiresAt: expiresAt,
        planCancelledAt: null,
      },
    }),
  ]);

  await createNotification({
    userId: paymentOrder.userId,
    category: "system",
    emoji: "✅",
    title: `Payment confirmed — you're on the ${PLAN_LIMITS[paymentOrder.plan].label} plan`,
    body: `Your ${methodLabel(paymentOrder.paymentMethod)} payment of ${(paymentOrder.amountCents / 100).toLocaleString()} EGP was verified. Your plan is active for ${months} ${months === 1 ? "month" : "months"}.`,
    href: "/account/subscription",
  });

  // VAT-style receipt email — required by Egyptian law for digital goods,
  // expected by customers as a paper trail. Fire-and-forget; never block
  // the webhook response on Resend hiccups.
  const receipt = paymentReceiptEmail({
    name: paymentOrder.user.name,
    userId: paymentOrder.userId,
    planLabel: PLAN_LIMITS[paymentOrder.plan].label,
    amountEgp: Math.round(paymentOrder.amountCents / 100),
    durationMonths: months,
    paidAt: now,
    expiresAt,
    orderId: paymentOrder.id,
    paymentMethodLabel: methodLabel(paymentOrder.paymentMethod),
  });
  void sendEmail({
    toUserId: paymentOrder.userId,
    toEmail: paymentOrder.user.email,
    subject: receipt.subject,
    category: "payment_receipt",
    html: receipt.html,
  }).catch((e) => {
    console.warn("[paymob-webhook] receipt email failed", e);
  });

  // Referral commission — idempotent + first-paid-only.
  await processReferralCommission(paymentOrder.id).catch((e) => {
    console.warn("[paymob-webhook] referral commission failed", e);
  });

  return Response.json({ ok: true });
}

// Some Paymob dashboards send a GET first (health-check style). Return
// a tiny JSON ack so the integration test doesn't flag the URL.
export async function GET() {
  return Response.json({ ok: true, service: "paymob-webhook" });
}
