import { headers } from "next/headers";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import type { Plan } from "@/generated/prisma/client";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import {
  cancelSubscriptionAction,
  reactivateSubscriptionAction,
} from "@/app/actions/subscription";
import { ensureReferralCode, getReferralUrl } from "@/lib/credits";
import CancelButton from "./CancelButton";
import ReferralCard from "./ReferralCard";

const PLAN_ORDER: Plan[] = ["FREE", "BASIC", "PRO", "PREMIUM"];

export default async function SubscriptionPage() {
  const [user, locale] = await Promise.all([requireUser(), getLocale()]);
  const t = getTranslations(locale);
  const tA = t.account;
  const planTr = t.plans.perPlan[user.plan];

  const [payments, creditTransactions, referralCode, headerList] = await Promise.all([
    prisma.paymentOrder.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.creditTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    ensureReferralCode(user.id),
    headers(),
  ]);

  // Build referral URL from the request host so dev / staging both work.
  const host = headerList.get("host") ?? "medexamhub.org";
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const referralUrl = getReferralUrl(referralCode, `${proto}://${host}`);

  const now = new Date();
  const expiresAt = user.planExpiresAt;
  const daysRemaining = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    : 0;
  const isCancelled = !!user.planCancelledAt;
  const isExpired = !!expiresAt && expiresAt < now;
  const isPaid = user.plan !== "FREE";

  let statusText = tA.statusFree;
  let statusColor = "bg-zinc-100 text-zinc-800";
  if (isPaid) {
    if (isExpired) {
      statusText = tA.statusExpired;
      statusColor = "bg-red-100 text-red-800";
    } else if (isCancelled) {
      statusText = tA.statusCancelled;
      statusColor = "bg-amber-100 text-amber-800";
    } else {
      statusText = tA.statusActive;
      statusColor = "bg-emerald-100 text-emerald-800";
    }
  }

  const fmtDate = (d: Date | null) =>
    d ? d.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" }) : "—";

  const upgradeTargets: Plan[] = (() => {
    const idx = PLAN_ORDER.indexOf(user.plan);
    return PLAN_ORDER.slice(idx + 1);
  })();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; {tA.backToDashboard}
      </Link>
      <h1 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">{tA.title}</h1>

      {/* Plan summary card */}
      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {tA.yourPlan}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-2xl font-semibold">{planTr.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                {statusText}
              </span>
            </div>
            {isPaid && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {PLAN_LIMITS[user.plan].priceMonthly.toLocaleString(locale)}{" "}
                {t.plans.currencyShort} {t.plans.perMonth}
              </p>
            )}
          </div>
          {isPaid && expiresAt && !isExpired && (
            <div className="text-right">
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {tA.daysRemaining.replace("{n}", "")}
              </div>
              <div className="mt-1 text-3xl font-semibold">{daysRemaining}</div>
            </div>
          )}
        </div>

        {isPaid && (
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-zinc-200 pt-5 text-sm dark:border-zinc-800">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {tA.startedOn}
              </dt>
              <dd className="mt-1">{fmtDate(user.planStartedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {tA.expiresOn}
              </dt>
              <dd className="mt-1">{fmtDate(user.planExpiresAt)}</dd>
            </div>
          </dl>
        )}

        {isPaid && isCancelled && expiresAt && (
          <p className="mt-5 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {tA.cancelledNotice.replace("{date}", fmtDate(expiresAt))}
          </p>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          {isPaid && (
            <Link
              href={`/checkout/${user.plan.toLowerCase()}`}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {tA.renew}
            </Link>
          )}
          {isPaid && isCancelled && (
            <form action={reactivateSubscriptionAction}>
              <button
                type="submit"
                className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
              >
                {tA.reactivate}
              </button>
            </form>
          )}
          {isPaid && !isCancelled && (
            <CancelButton
              action={cancelSubscriptionAction}
              label={tA.cancel}
              confirmText={
                expiresAt && expiresAt > now
                  ? tA.cancelConfirm.replace("{date}", fmtDate(expiresAt))
                  : tA.cancelConfirmImmediate
              }
            />
          )}
        </div>
      </section>

      <ReferralCard referralUrl={referralUrl} balance={user.creditsBalance} />

      {/* Credit history */}
      {creditTransactions.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Credit history</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {creditTransactions.map((tx) => {
                const isEarn = tx.amount > 0;
                return (
                  <li key={tx.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium">
                        {tx.description ?? labelForType(tx.type)}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {fmtDate(tx.createdAt)}
                      </div>
                    </div>
                    <div
                      className={`shrink-0 font-mono font-semibold ${
                        isEarn ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {isEarn ? "+" : ""}{tx.amount}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Upgrade options */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">{tA.upgradeOptions}</h2>
        {upgradeTargets.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">{tA.noUpgrades}</p>
        ) : !isPaid ? (
          <p className="mt-2 text-sm text-zinc-500">{tA.freeUpgradeNote}</p>
        ) : null}
        {upgradeTargets.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {upgradeTargets.map((target) => {
              const cfg = PLAN_LIMITS[target];
              const targetTr = t.plans.perPlan[target];
              return (
                <Link
                  key={target}
                  href={`/checkout/${target.toLowerCase()}`}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-800"
                >
                  <div className="text-sm font-semibold">{targetTr.label}</div>
                  {cfg.originalPriceMonthly && (
                    <div className="mt-1 text-xs text-zinc-400 line-through">
                      {cfg.originalPriceMonthly.toLocaleString(locale)} {t.plans.currencyShort}
                    </div>
                  )}
                  <div className={cfg.originalPriceMonthly ? "text-2xl font-semibold" : "mt-1 text-2xl font-semibold"}>
                    {cfg.priceMonthly.toLocaleString(locale)}{" "}
                    <span className="text-base font-medium text-zinc-500">
                      {t.plans.currencyShort}
                    </span>
                    <span className="text-sm text-zinc-500">{t.plans.perMonth}</span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">{targetTr.description}</p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Payment history */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">{tA.paymentHistory}</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {payments.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">{tA.paymentEmpty}</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/30">
                <tr>
                  <th className="px-4 py-3 text-start">{tA.colDate}</th>
                  <th className="px-4 py-3 text-start">{tA.colPlan}</th>
                  <th className="px-4 py-3 text-end">{tA.colAmount}</th>
                  <th className="px-4 py-3 text-end">{tA.colStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {payments.map((p) => {
                  const statusLabel =
                    p.status === "PAID"
                      ? tA.paidStatus
                      : p.status === "FAILED"
                        ? tA.failedStatus
                        : tA.pendingStatus;
                  const statusStyle =
                    p.status === "PAID"
                      ? "bg-emerald-100 text-emerald-800"
                      : p.status === "FAILED"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800";
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-3">{fmtDate(p.paidAt ?? p.createdAt)}</td>
                      <td className="px-4 py-3">{t.plans.perPlan[p.plan].label}</td>
                      <td className="px-4 py-3 text-end font-mono">
                        {(p.amountCents / 100).toLocaleString(locale)} {p.currency}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle}`}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function labelForType(type: string): string {
  switch (type) {
    case "signup_bonus":
      return "Welcome bonus";
    case "referral_commission":
      return "Referral commission";
    case "redemption_discount":
      return "Discount applied";
    case "redemption_refund":
      return "Refund";
    case "manual_adjust":
      return "Manual adjustment";
    default:
      return type;
  }
}
