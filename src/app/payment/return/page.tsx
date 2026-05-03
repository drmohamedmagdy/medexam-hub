import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { verifyCheckoutToken } from "@/lib/paymob";
import { PaymentStatus } from "@/generated/prisma/client";
import { PLAN_LIMITS } from "@/lib/plans";

const CHECKOUT_COOKIE = "mxh_checkout";

export default async function PaymentReturnPage() {
  const user = await requireUser();
  const jar = await cookies();
  const token = jar.get(CHECKOUT_COOKIE)?.value;

  if (!token) return <ErrorBox reason="missing-token" />;

  const verified = verifyCheckoutToken(token);
  if (!verified) return <ErrorBox reason="invalid-or-expired" />;

  const order = await prisma.paymentOrder.findUnique({ where: { id: verified.orderId } });
  if (!order || order.userId !== user.id) return <ErrorBox reason="order-not-found" />;

  if (order.status !== PaymentStatus.PAID) {
    const now = new Date();
    const isRenewalSamePlan = user.plan === order.plan && user.planExpiresAt && user.planExpiresAt > now;
    const baseDate = isRenewalSamePlan ? user.planExpiresAt! : now;
    const expiresAt = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
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
  }

  jar.delete(CHECKOUT_COOKIE);

  const cfg = PLAN_LIMITS[order.plan];

  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <span className="text-3xl">✓</span>
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">You&apos;re on the {cfg.label} plan</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Your account has been upgraded. You can now generate up to {cfg.monthlyExams} exams per month
        with up to {cfg.maxQuestionsPerExam} questions each.
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Active for 30 days. Renew before {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}.
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

function ErrorBox({ reason }: { reason: string }) {
  const messages: Record<string, string> = {
    "missing-token": "We couldn't find your checkout session. If you completed a payment, please contact support and we'll activate your account manually.",
    "invalid-or-expired": "Your checkout session expired. If you already paid, please reply to your Paymob receipt email and we'll activate your plan within 24 hours.",
    "order-not-found": "We couldn't match this checkout to your account. Please contact support.",
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
