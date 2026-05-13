import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { PLAN_LIMITS, PROMO_DISCOUNT_PCT } from "@/lib/plans";
import type { Plan } from "@/generated/prisma/client";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import UpgradeButton from "./UpgradeButton";

const ORDER: Plan[] = ["FREE", "BASIC", "PRO", "PREMIUM", "RESEARCHER"];

export default async function PlansPage() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  const t = getTranslations(locale);
  const isRtlNumberLocale = locale === "ar" || locale === "ur" || locale === "fa";
  const numberLocale = isRtlNumberLocale ? "en-US" : locale;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.plans.title}</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{t.plans.subtitle}</p>
        {PROMO_DISCOUNT_PCT > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <span aria-hidden>🎉</span>
            <span>Limited-time {PROMO_DISCOUNT_PCT}% OFF on all paid plans</span>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {ORDER.map((plan) => {
          const cfg = PLAN_LIMITS[plan];
          const tp = t.plans.perPlan[plan];
          const isCurrent = user?.plan === plan;
          const isSpecial = cfg.badge === "Special service";
          const isPopular = cfg.badge === "Most popular";
          const isHighlighted = isPopular || isSpecial;
          const badgeText = isPopular
            ? t.plans.badgePopular
            : cfg.badge === "Best value"
              ? t.plans.badgeValue
              : isSpecial
                ? "✨ Special service"
                : null;

          return (
            <div
              key={plan}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                isCurrent
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                  : isSpecial
                    ? "border-violet-500 ring-2 ring-violet-500/40 bg-gradient-to-b from-violet-50 to-white dark:from-violet-950/40 dark:to-zinc-900"
                    : isPopular
                      ? "border-blue-500 ring-2 ring-blue-500/30 bg-white dark:bg-zinc-900"
                      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              }`}
            >
              {badgeText && !isCurrent && (
                <span
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold ${
                    isPopular
                      ? "bg-blue-600 text-white"
                      : isSpecial
                        ? "bg-violet-600 text-white shadow-md"
                        : "bg-emerald-600 text-white"
                  }`}
                >
                  {badgeText}
                </span>
              )}

              <h3 className="text-lg font-semibold">{tp.label}</h3>
              <p className="mt-1 text-sm text-zinc-500">{tp.description}</p>
              <div className="mt-4">
                {cfg.priceMonthly === 0 ? (
                  <span className="text-3xl font-semibold">{t.plans.free}</span>
                ) : (
                  <>
                    {cfg.originalPriceMonthly && (
                      <div className="flex items-center gap-2">
                        <span className="text-base text-zinc-400 line-through">
                          {cfg.originalPriceMonthly.toLocaleString(numberLocale)} {t.plans.currencyShort}
                        </span>
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                          −{PROMO_DISCOUNT_PCT}%
                        </span>
                      </div>
                    )}
                    <div className={cfg.originalPriceMonthly ? "mt-0.5" : ""}>
                      <span className="text-3xl font-semibold">
                        {cfg.priceMonthly.toLocaleString(numberLocale)}
                      </span>
                      <span className="mx-1 text-base font-medium text-zinc-500">
                        {t.plans.currencyShort}
                      </span>
                      <span className="text-sm text-zinc-500">{t.plans.perMonth}</span>
                    </div>
                  </>
                )}
              </div>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {tp.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-emerald-600">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full rounded-md bg-zinc-200 py-2.5 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {t.plans.current}
                  </button>
                ) : !user ? (
                  <Link
                    href="/signup"
                    className="block w-full rounded-md bg-blue-600 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700"
                  >
                    {t.plans.signUp}
                  </Link>
                ) : plan === "FREE" ? (
                  <Link
                    href="/dashboard"
                    className="block w-full rounded-md border border-zinc-300 py-2.5 text-center text-sm font-medium dark:border-zinc-700"
                  >
                    {t.plans.goDashboard}
                  </Link>
                ) : (
                  <UpgradeButton plan={plan} label={t.plans.upgrade} />
                )}
                {cfg.priceMonthly > 0 && !isCurrent && plan !== "RESEARCHER" && (
                  <p className="mt-2 text-center text-[11px] text-emerald-700 dark:text-emerald-400">
                    💰 Save up to 25% with annual billing
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
