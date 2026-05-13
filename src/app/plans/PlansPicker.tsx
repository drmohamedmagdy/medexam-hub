"use client";

import Link from "next/link";
import { useState } from "react";
import type { Plan } from "@/generated/prisma/client";
import {
  BILLING_CYCLES,
  priceForCycle,
  type BillingCycle,
} from "@/lib/plans";
import UpgradeButton from "./UpgradeButton";

// Display-only metadata for each cycle option. Kept as a tuple so the
// toggle and the per-card price calc share the same ordering.
const CYCLE_LABELS: Array<{ months: BillingCycle; short: string }> = [
  { months: 1, short: "Monthly" },
  { months: 3, short: "3 months" },
  { months: 6, short: "6 months" },
  { months: 12, short: "Annual" },
];

export type PlanCardData = {
  plan: Plan;
  label: string;
  description: string;
  features: string[];
  priceMonthly: number; // anchor price for cycle calculations
  badge: "popular" | "value" | "special" | null;
  badgeText: string | null;
  /** "current" disables the button; "signin" sends to /signup with next= */
  ctaKind: "current" | "signin" | "upgrade" | "dashboard";
  signUpHref: string; // pre-built /signup?next=... or /login?next=...
  dashboardLabel: string;
  signUpLabel: string;
  upgradeLabel: string;
  currentLabel: string;
};

export default function PlansPicker({
  plans,
  freePlanIndex,
  numberLocale,
}: {
  plans: PlanCardData[];
  freePlanIndex: number; // index in `plans` of the FREE row, so we don't show the cycle toggle on its card
  numberLocale: string;
}) {
  const [cycle, setCycle] = useState<BillingCycle>(1);

  return (
    <>
      {/* Cycle toggle — discount lives here so users see why annual is cheaper. */}
      <div className="mt-6 flex justify-center">
        <div
          role="tablist"
          aria-label="Billing period"
          className="inline-flex flex-wrap items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {CYCLE_LABELS.map(({ months, short }) => {
            const selected = months === cycle;
            const pct = priceForCycle("BASIC", months).savingsPct;
            return (
              <button
                key={months}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setCycle(months)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                  selected
                    ? "bg-blue-600 text-white shadow"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                }`}
              >
                <span>{short}</span>
                {pct > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      selected
                        ? "bg-white/20 text-white"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                    }`}
                  >
                    −{pct}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {plans.map((p, idx) => {
          const isFree = idx === freePlanIndex;
          const cyclePrice =
            !isFree && p.priceMonthly > 0
              ? priceForCycle(p.plan, cycle)
              : null;
          const isHighlighted = p.badge === "popular" || p.badge === "special";

          // Pre-compute the upgrade link with the selected cycle so the
          // user lands on checkout with that period already chosen.
          const upgradeHrefBase = `/checkout/${p.plan.toLowerCase()}`;
          const upgradeHref =
            cycle === 1 ? upgradeHrefBase : `${upgradeHrefBase}?cycle=${cycle}`;
          // For non-signed-in users we route through /signup with `next=` so
          // they land back on the same checkout page (correct cycle) after
          // creating their account.
          const signUpWithNext = `/signup?next=${encodeURIComponent(upgradeHref)}`;

          return (
            <div
              key={p.plan}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                p.ctaKind === "current"
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                  : p.badge === "special"
                    ? "border-violet-500 ring-2 ring-violet-500/40 bg-gradient-to-b from-violet-50 to-white dark:from-violet-950/40 dark:to-zinc-900"
                    : p.badge === "popular"
                      ? "border-blue-500 ring-2 ring-blue-500/30 bg-white dark:bg-zinc-900"
                      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              }`}
            >
              {p.badgeText && p.ctaKind !== "current" && (
                <span
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold ${
                    p.badge === "popular"
                      ? "bg-blue-600 text-white"
                      : p.badge === "special"
                        ? "bg-violet-600 text-white shadow-md"
                        : "bg-emerald-600 text-white"
                  }`}
                >
                  {p.badgeText}
                </span>
              )}

              <h3 className="text-lg font-semibold">{p.label}</h3>
              <p className="mt-1 text-sm text-zinc-500">{p.description}</p>

              <div className="mt-4">
                {isFree || p.priceMonthly === 0 ? (
                  <span className="text-3xl font-semibold">Free</span>
                ) : cyclePrice ? (
                  <>
                    {cyclePrice.savingsPct > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-base text-zinc-400 line-through">
                          {cyclePrice.baseline.toLocaleString(numberLocale)} EGP
                        </span>
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                          −{cyclePrice.savingsPct}%
                        </span>
                      </div>
                    )}
                    <div className={cyclePrice.savingsPct > 0 ? "mt-0.5" : ""}>
                      <span className="text-3xl font-semibold">
                        {cyclePrice.perMonth.toLocaleString(numberLocale)}
                      </span>
                      <span className="mx-1 text-base font-medium text-zinc-500">
                        EGP
                      </span>
                      <span className="text-sm text-zinc-500">/ month</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {cycle === 1
                        ? `Billed monthly`
                        : `${cyclePrice.total.toLocaleString(numberLocale)} EGP billed every ${cycle} months`}
                    </p>
                  </>
                ) : null}
              </div>

              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-emerald-600">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {p.ctaKind === "current" ? (
                  <button
                    disabled
                    className="w-full rounded-md bg-zinc-200 py-2.5 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {p.currentLabel}
                  </button>
                ) : p.ctaKind === "signin" ? (
                  <Link
                    href={signUpWithNext}
                    className="block w-full rounded-md bg-blue-600 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700"
                  >
                    {p.signUpLabel}
                  </Link>
                ) : p.ctaKind === "dashboard" ? (
                  <Link
                    href="/dashboard"
                    className="block w-full rounded-md border border-zinc-300 py-2.5 text-center text-sm font-medium dark:border-zinc-700"
                  >
                    {p.dashboardLabel}
                  </Link>
                ) : (
                  <UpgradeButton href={upgradeHref} label={p.upgradeLabel} />
                )}
              </div>
              {/* avoid unused-var warning when no plan card is highlighted via this prop */}
              <span className="hidden">{isHighlighted ? "" : ""}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
