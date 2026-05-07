import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PLAN_LIMITS, PROMO_DISCOUNT_PCT, formatPrice } from "@/lib/plans";
import { PAYMOB_LINKS } from "@/lib/paymob";
import type { Plan } from "@/generated/prisma/client";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import CheckoutForm from "./CheckoutForm";

const PAID_PLANS = ["BASIC", "PRO", "PREMIUM", "RESEARCHER"] as const;
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
  RESEARCHER: [
    "5 research projects / month",
    "25 statistical analyses / month",
    "25 file uploads / month",
    "Pay credits to extend any limit (perpetual top-up pool)",
    "500 exam questions / month",
    "Word + PDF exports with embedded charts",
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

  // Buying the SAME plan you're already on is a valid action — it extends
  // your expiry by 30 days from your current expiry (handled in /payment/return
  // and the manual approval flow). So we no longer block here.
  const user = await requireUser();

  const plan = planUpper as PaidPlan;
  const cfg = PLAN_LIMITS[plan];
  const cardPaymentReady = !PAYMOB_LINKS[plan]?.includes("CHANGE_ME_");

  const locale = await getLocale();
  const allT = getTranslations(locale);
  const t = allT.checkout;
  const tCredits = allT.credits;
  const subtitle = t.subtitle.replace("{price}", formatPrice(cfg.priceMonthly));
  const promoBadge =
    PROMO_DISCOUNT_PCT > 0 && cfg.originalPriceMonthly
      ? t.promoBadge
          .replace("{pct}", String(PROMO_DISCOUNT_PCT))
          .replace("{amount}", (cfg.originalPriceMonthly - cfg.priceMonthly).toLocaleString())
      : null;

  // Split termsAgreement around the link text so we can wrap the link in a Next Link.
  const termsParts = t.termsAgreement.split(t.termsLinkText);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/plans" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; {t.back}
      </Link>

      <h1 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">{t.title}</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
      {promoBadge && (
        <p className="mt-2 inline-flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <span aria-hidden>🎉</span>
          <span>{promoBadge}</span>
        </p>
      )}

      {!cardPaymentReady && (
        <p className="mt-3 inline-flex items-start gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          <span aria-hidden>ℹ️</span>
          <span>
            Card payment is being set up for this plan. Please pay via{" "}
            <strong>Vodafone Cash</strong> or <strong>InstaPay</strong> below — your
            access activates after admin review (usually within an hour).
          </span>
        </p>
      )}

      <div className="mt-6 grid gap-5 sm:mt-8 sm:gap-6 lg:grid-cols-[1fr_1.2fr]">
        <aside className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {t.orderSummary}
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
          <p className="text-xs text-zinc-500">{t.billedMonthly}</p>

          <ul className="mt-6 space-y-2 text-sm">
            {PLAN_FEATURES[plan].map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-emerald-600">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-baseline justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <span className="text-sm font-medium">{t.totalToday}</span>
            <div className="text-right">
              {cfg.originalPriceMonthly && (
                <div className="text-sm text-zinc-400 line-through">
                  {formatPrice(cfg.originalPriceMonthly)}
                </div>
              )}
              <span className="text-2xl font-semibold">{formatPrice(cfg.priceMonthly)}</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-zinc-500">{t.taxNote}</p>
        </aside>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {t.paymentSection}
          </h2>

          <div className="mt-4 rounded-md bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800/50">
            <span className="text-zinc-500">{t.account}</span>{" "}
            <span className="font-medium">{user.email}</span>
          </div>

          <CheckoutForm
            plan={plan}
            priceMonthly={cfg.priceMonthly}
            t={t}
            tCredits={tCredits}
            creditsBalance={user.creditsBalance}
          />

          <p className="mt-6 text-xs text-zinc-500">
            {termsParts[0]}
            <Link href="/terms" className="underline hover:text-zinc-700">{t.termsLinkText}</Link>
            {termsParts.slice(1).join(t.termsLinkText)}
          </p>
        </section>
      </div>
    </div>
  );
}
