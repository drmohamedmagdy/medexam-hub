import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PLAN_LIMITS, formatPrice } from "@/lib/plans";
import type { Plan } from "@/generated/prisma/client";
import CheckoutForm from "./CheckoutForm";

const PAID_PLANS = ["BASIC", "PRO", "PREMIUM"] as const;
type PaidPlan = (typeof PAID_PLANS)[number];

const PLAN_FEATURES: Record<PaidPlan, string[]> = {
  BASIC: [
    "15 AI exams per month",
    "Up to 25 questions per exam",
    "Generate by specialty or by exam type",
    "Exam history",
  ],
  PRO: [
    "50 AI exams per month (up to 1,500 questions)",
    "Up to 30 questions per exam",
    "Upload up to 2 files / month (coming soon)",
    "Exam history",
  ],
  PREMIUM: [
    "100 AI exams per month (up to 4,000 questions)",
    "Up to 40 questions per exam",
    "Upload up to 10 files / month (coming soon)",
    "Advanced analytics (coming soon)",
  ],
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ plan: string }>;
}) {
  const { plan: planSlug } = await params;
  const planUpper = planSlug.toUpperCase() as Plan;

  if (!PAID_PLANS.includes(planUpper as PaidPlan)) redirect("/plans");

  const user = await requireUser();
  if (user.plan === planUpper) redirect("/dashboard");

  const plan = planUpper as PaidPlan;
  const cfg = PLAN_LIMITS[plan];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/plans" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; Back to plans
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Complete your upgrade</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        You&apos;ll be charged {formatPrice(cfg.priceMonthly)} per month and can cancel anytime.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <aside className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Order summary
          </h2>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-lg font-semibold">{cfg.label} plan</span>
            <span className="text-2xl font-semibold">{formatPrice(cfg.priceMonthly)}</span>
          </div>
          <p className="text-xs text-zinc-500">Billed monthly</p>

          <ul className="mt-6 space-y-2 text-sm">
            {PLAN_FEATURES[plan].map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-emerald-600">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-baseline justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <span className="text-sm font-medium">Total today</span>
            <span className="text-2xl font-semibold">{formatPrice(cfg.priceMonthly)}</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Egyptian Pounds, taxes may apply</p>
        </aside>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Payment
          </h2>

          <div className="mt-4 rounded-md bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800/50">
            <span className="text-zinc-500">Account:</span>{" "}
            <span className="font-medium">{user.email}</span>
          </div>

          <CheckoutForm
            plan={plan}
            priceMonthly={cfg.priceMonthly}
            priceMonthlyUsd={cfg.priceMonthlyUsd}
          />

          <p className="mt-6 text-xs text-zinc-500">
            By clicking continue you agree to the{" "}
            <Link href="/" className="underline hover:text-zinc-700">terms of service</Link>.
            Subscription renews monthly and can be cancelled at any time.
          </p>
        </section>
      </div>
    </div>
  );
}
