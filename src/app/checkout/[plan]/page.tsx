import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PLAN_LIMITS, PROMO_DISCOUNT_PCT, formatPrice } from "@/lib/plans";
import type { Plan } from "@/generated/prisma/client";
import CheckoutForm from "./CheckoutForm";

const PAID_PLANS = ["BASIC", "PRO", "PREMIUM"] as const;
type PaidPlan = (typeof PAID_PLANS)[number];

const PLAN_FEATURES: Record<PaidPlan, string[]> = {
  BASIC: [
    "20 AI exams per month (up to 400 questions)",
    "Up to 20 questions per exam",
    "Upload up to 3 files / month",
    "Exam history",
  ],
  PRO: [
    "50 AI exams per month (up to 1,500 questions)",
    "Up to 30 questions per exam",
    "Upload up to 6 files / month",
    "Download completed exams as PDF",
  ],
  PREMIUM: [
    "100 AI exams per month (up to 5,000 questions)",
    "Up to 50 questions per exam",
    "Upload up to 15 files / month",
    "Advanced analytics",
    "Download completed exams as PDF",
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
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/plans" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; Back to plans
      </Link>

      <h1 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">Complete your upgrade</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        You&apos;ll be charged {formatPrice(cfg.priceMonthly)} per month and can cancel anytime.
      </p>
      {PROMO_DISCOUNT_PCT > 0 && cfg.originalPriceMonthly && (
        <p className="mt-2 inline-flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <span aria-hidden>🎉</span>
          <span>
            {PROMO_DISCOUNT_PCT}% off — save{" "}
            {(cfg.originalPriceMonthly - cfg.priceMonthly).toLocaleString()} EGP/month
          </span>
        </p>
      )}

      <div className="mt-6 grid gap-5 sm:mt-8 sm:gap-6 lg:grid-cols-[1fr_1.2fr]">
        <aside className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Order summary
          </h2>
          <div className="mt-4 flex items-baseline justify-between gap-3">
            <span className="text-lg font-semibold">{cfg.label} plan</span>
            <div className="text-right">
              {cfg.originalPriceMonthly && (
                <div className="text-sm text-zinc-400 line-through">
                  {formatPrice(cfg.originalPriceMonthly)}
                </div>
              )}
              <span className="text-2xl font-semibold">{formatPrice(cfg.priceMonthly)}</span>
            </div>
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
            <div className="text-right">
              {cfg.originalPriceMonthly && (
                <div className="text-sm text-zinc-400 line-through">
                  {formatPrice(cfg.originalPriceMonthly)}
                </div>
              )}
              <span className="text-2xl font-semibold">{formatPrice(cfg.priceMonthly)}</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Egyptian Pounds, taxes may apply</p>
        </aside>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Payment
          </h2>

          <div className="mt-4 rounded-md bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800/50">
            <span className="text-zinc-500">Account:</span>{" "}
            <span className="font-medium">{user.email}</span>
          </div>

          <CheckoutForm plan={plan} priceMonthly={cfg.priceMonthly} />

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
