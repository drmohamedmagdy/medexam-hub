import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";

export const metadata = { title: "Payment under review" };

export default async function PendingPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const order = await prisma.paymentOrder.findUnique({ where: { id } });
  if (!order || order.userId !== user.id) redirect("/dashboard");
  // Card / Paymob orders go through /payment/return — don't surface them here.
  if (order.paymentMethod === "CARD") redirect("/payment/return");

  const cfg = PLAN_LIMITS[order.plan];
  const amount = (order.amountCents / 100).toLocaleString();
  const methodLabel =
    order.paymentMethod === "VODAFONE_CASH" ? "Vodafone Cash" : "Instapay";

  if (order.status === "PAID") {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          You&apos;re on the {cfg.label} plan
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Your {methodLabel} payment was verified. Plan active for 30 days.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/exam/new"
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Generate an exam
          </Link>
          <Link
            href="/account/subscription"
            className="rounded-md border border-zinc-300 px-5 py-2 text-sm dark:border-zinc-700"
          >
            Manage subscription
          </Link>
        </div>
      </div>
    );
  }

  if (order.status === "FAILED") {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700">
          <span className="text-3xl">!</span>
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Couldn&apos;t verify your payment</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {order.rejectionReason ?? "Our admin couldn't match your transaction reference."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={`/checkout/${order.plan.toLowerCase()}`}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Try again
          </Link>
          <Link
            href="/contact"
            className="rounded-md border border-zinc-300 px-5 py-2 text-sm dark:border-zinc-700"
          >
            Contact support
          </Link>
        </div>
      </div>
    );
  }

  // PENDING
  return (
    <div className="mx-auto max-w-xl px-4 py-12 text-center sm:px-6">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <span className="text-3xl">⏳</span>
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Payment under review</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Thanks! We&apos;ve received your {methodLabel} submission for the {cfg.label} plan.
        We&apos;ll verify the transaction and activate your plan, usually within 24 hours.
      </p>

      <dl className="mx-auto mt-8 max-w-sm space-y-2 rounded-2xl border border-zinc-200 bg-white p-5 text-start text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <Row label="Plan" value={cfg.label} />
        <Row label="Amount" value={`${amount} EGP`} />
        <Row label="Method" value={methodLabel} />
        <Row label="Reference" value={order.proofRef ?? "—"} mono />
        <Row label="Submitted" value={order.createdAt.toLocaleString()} />
      </dl>

      <p className="mt-6 text-xs text-zinc-500">
        You&apos;ll get a notification as soon as we verify your payment. Keep this page&apos;s URL —
        it shows the latest status.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Back to dashboard
        </Link>
        <Link
          href="/contact"
          className="rounded-md border border-zinc-300 px-5 py-2 text-sm dark:border-zinc-700"
        >
          Contact support
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-zinc-500">{label}</dt>
      <dd className={mono ? "font-mono" : "font-medium"}>{value}</dd>
    </div>
  );
}
