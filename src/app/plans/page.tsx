import { getCurrentUser } from "@/lib/auth";
import { PLAN_LIMITS } from "@/lib/plans";
import type { Plan } from "@/generated/prisma/client";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import PlansPicker, { type PlanCardData } from "./PlansPicker";

const ORDER: Plan[] = ["FREE", "BASIC", "PRO", "PREMIUM", "RESEARCHER"];

export default async function PlansPage() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  const t = getTranslations(locale);
  const isRtlNumberLocale = locale === "ar" || locale === "ur" || locale === "fa";
  const numberLocale = isRtlNumberLocale ? "en-US" : locale;

  const plans: PlanCardData[] = ORDER.map((plan) => {
    const cfg = PLAN_LIMITS[plan];
    const tp = t.plans.perPlan[plan];
    const isCurrent = user?.plan === plan;
    const isSpecial = cfg.badge === "Special service";
    const isPopular = cfg.badge === "Most popular";
    const badgeText = isPopular
      ? t.plans.badgePopular
      : cfg.badge === "Best value"
        ? t.plans.badgeValue
        : isSpecial
          ? "✨ Special service"
          : null;

    const ctaKind: PlanCardData["ctaKind"] = isCurrent
      ? "current"
      : !user
        ? "signin"
        : plan === "FREE"
          ? "dashboard"
          : "upgrade";

    return {
      plan,
      label: tp.label,
      description: tp.description,
      features: tp.features,
      priceMonthly: cfg.priceMonthly,
      badge: isPopular ? "popular" : isSpecial ? "special" : cfg.badge === "Best value" ? "value" : null,
      badgeText,
      ctaKind,
      signUpHref: "/signup",
      dashboardLabel: t.plans.goDashboard,
      signUpLabel: t.plans.signUp,
      upgradeLabel: t.plans.upgrade,
      currentLabel: t.plans.current,
    };
  });

  const freePlanIndex = ORDER.indexOf("FREE");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.plans.title}</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{t.plans.subtitle}</p>
        {/* Discount announcement — always-visible reminder. The cycle toggle
            below lets users compare prices side-by-side. */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          <span aria-hidden>💰</span>
          <span>Save up to 25% with annual billing — pick a longer period below.</span>
        </div>
      </div>

      <PlansPicker plans={plans} freePlanIndex={freePlanIndex} numberLocale={numberLocale} />
    </div>
  );
}
