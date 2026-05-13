import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { verifyCheckoutToken } from "@/lib/paymob";
import { PaymentStatus } from "@/generated/prisma/client";
import { PLAN_LIMITS } from "@/lib/plans";
import { processReferralCommission } from "@/lib/credits";

const CHECKOUT_COOKIE = "mxh_checkout";

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{
    merchant_order_id?: string;
    success?: string;
    [key: string]: string | undefined;
  }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  // Resolve the order id from three possible sources, in order of trust:
  //   1. Paymob's return query string (?merchant_order_id=...) — present
  //      on the new Intention API flow, and what we trust by default.
  //   2. The mxh_checkout cookie set when we created the order — kept as
  //      a fallback for the legacy short-link flow.
  //   3. The user's most recent order in the last hour — last-ditch so a
  //      stale session still shows the right screen.
  const jar = await cookies();
  const cookieToken = jar.get(CHECKOUT_COOKIE)?.value;
  const verifiedCookie = cookieToken ? verifyCheckoutToken(cookieToken) : null;
  const queryOrderId = sp.merchant_order_id?.trim() || null;

  let orderId: string | null = queryOrderId ?? verifiedCookie?.orderId ?? null;
  if (!orderId) {
    const recent = await prisma.paymentOrder.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    orderId = recent?.id ?? null;
  }

  if (!orderId) return <ErrorBox reason="missing-token" />;

  const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== user.id) {
    return <ErrorBox reason="order-not-found" />;
  }

  const paymobSaidSuccess = sp.success === "true";

  if (order.status !== PaymentStatus.PAID) {
    // Top-up orders aren't auto-applied here — Paymob card payments for
    // top-ups aren't sold yet (only manual flow), and even if they were,
    // the bonus grant should happen via the admin/manual approval path.
    if (order.topupKind) {
      return <ErrorBox reason="topup-needs-manual" />;
    }
    // If Paymob's return params say success=false or the param is missing
    // entirely, trust the webhook — show a pending page instead of force-
    // paying an order that didn't actually succeed.
    if (!paymobSaidSuccess) {
      return <PendingBox />;
    }
    const now = new Date();
    const isRenewalSamePlan = user.plan === order.plan && user.planExpiresAt && user.planExpiresAt > now;
    const baseDate = isRenewalSamePlan ? user.planExpiresAt! : now;
    const months = order.durationMonths || 1;
    const expiresAt = new Date(baseDate.getTime() + months * 30 * 24 * 60 * 60 * 1000);
    const startedAt = isRenewalSamePlan ? user.planStartedAt ?? now : now;

    await prisma.$transaction([
      prisma.paymentOrder.update({
        where: { id: order.id },
        data: { status: PaymentStatus.PAID, paidAt: now },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          plan: order.plan,
          planStartedAt: startedAt,
          planExpiresAt: expiresAt,
          planCancelledAt: null,
        },
      }),
    ]);

    // Best-effort referral commission — never fail the upgrade on this.
    void processReferralCommission(order.id).catch(() => {});
  }

  // NOTE: deliberately NOT deleting the cookie here. In Next 16, cookies()
  // is read-only during a Server Component render — mutating throws and
  // crashed the page. The cookie has a 30-minute TTL and gets rotated on
  // the next checkout, so leaving it is harmless.

  const cfg = PLAN_LIMITS[order.plan];

  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <span className="text-3xl">✓</span>
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">You&apos;re on the {cfg.label} plan</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Your account has been upgraded. You can now generate up to{" "}
        {cfg.monthlyQuestions.toLocaleString()} questions per month, with up to{" "}
        {cfg.maxQuestionsPerExam} questions per exam.
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Active for {order.durationMonths} {order.durationMonths === 1 ? "month" : "months"}. Renew before{" "}
        {new Date(Date.now() + (order.durationMonths || 1) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/exam/new" className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Generate an exam
        </Link>
        <Link href="/account/subscription" className="rounded-md border border-zinc-300 px-5 py-2 text-sm dark:border-zinc-700">
          Manage subscription
        </Link>
        <Link href="/dashboard" className="rounded-md border border-zinc-300 px-5 py-2 text-sm dark:border-zinc-700">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

function PendingBox() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700">
        <span className="text-3xl">⏳</span>
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Payment processing</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        We&apos;re waiting for Paymob to confirm your payment. This usually
        takes a few seconds — refresh this page in a moment, or check{" "}
        <Link href="/account/subscription" className="text-blue-600 hover:underline">
          your subscription page
        </Link>{" "}
        to see when the upgrade lands.
      </p>
      <Link
        href="/account/subscription"
        className="mt-6 inline-block rounded-md border border-zinc-300 px-5 py-2 text-sm dark:border-zinc-700"
      >
        Check status
      </Link>
    </div>
  );
}

function ErrorBox({ reason }: { reason: string }) {
  const messages: Record<string, string> = {
    "missing-token": "We couldn't find your checkout session. If you completed a payment, please contact support and we'll activate your account manually.",
    "invalid-or-expired": "Your checkout session expired. If you already paid, please reply to your Paymob receipt email and we'll activate your plan within 24 hours.",
    "order-not-found": "We couldn't match this checkout to your account. Please contact support.",
    "topup-needs-manual": "Card top-ups aren't auto-activated yet — please contact support and we'll add it manually.",
  };
  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <span className="text-3xl">!</span>
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Couldn&apos;t complete the upgrade</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{messages[reason] ?? "Unknown error."}</p>
      <Link href="/plans" className="mt-6 inline-block rounded-md border border-zinc-300 px-5 py-2 text-sm dark:border-zinc-700">
        Back to plans
      </Link>
    </div>
  );
}
