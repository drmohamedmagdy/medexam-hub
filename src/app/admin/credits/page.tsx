import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  CREDITS_PER_BONUS_FILE,
  CREDITS_PER_BONUS_QUESTION,
  MAX_CREDITS_DISCOUNT_FRACTION,
  REFERRAL_COMMISSION_CREDITS,
  SIGNUP_BONUS_CREDITS,
} from "@/lib/credits";
import { PLAN_LIMITS } from "@/lib/plans";
import type { Plan } from "@/generated/prisma/client";

export const metadata = { title: "Admin — Credits" };

const PLANS: Plan[] = ["FREE", "BASIC", "PRO", "PREMIUM", "RESEARCHER"];

export default async function AdminCreditsPage() {
  const [
    totalUsers,
    balanceAgg,
    earnedAgg,
    spentAgg,
    earnedByType,
    spentByType,
    recentTx,
    topReferrers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.aggregate({ _sum: { creditsBalance: true } }),
    prisma.creditTransaction.aggregate({
      where: { amount: { gt: 0 } },
      _sum: { amount: true },
    }),
    prisma.creditTransaction.aggregate({
      where: { amount: { lt: 0 } },
      _sum: { amount: true },
    }),
    prisma.creditTransaction.groupBy({
      by: ["type"],
      where: { amount: { gt: 0 } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.creditTransaction.groupBy({
      by: ["type"],
      where: { amount: { lt: 0 } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.creditTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { user: { select: { email: true, name: true, id: true } } },
    }),
    prisma.creditTransaction.groupBy({
      by: ["userId"],
      where: { type: "referral_commission" },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    }),
  ]);

  const balanceTotal = balanceAgg._sum.creditsBalance ?? 0;
  const earnedTotal = earnedAgg._sum.amount ?? 0;
  const spentTotal = Math.abs(spentAgg._sum.amount ?? 0);

  const topReferrerIds = topReferrers.map((r) => r.userId);
  const topReferrerUsers = topReferrerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: topReferrerIds } },
        select: { id: true, email: true, name: true, creditsBalance: true },
      })
    : [];
  const userById = new Map(topReferrerUsers.map((u) => [u.id, u]));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Credits & Referrals</h1>
      <p className="mt-1 text-sm text-zinc-500">
        How the credit / referral system is configured, and what users have earned and spent so far.
      </p>

      {/* Stats */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Users" value={totalUsers.toLocaleString()} hint="all accounts" />
        <Stat
          label="Credits in circulation"
          value={balanceTotal.toLocaleString()}
          hint={`across ${totalUsers.toLocaleString()} users`}
        />
        <Stat label="Total earned" value={`+${earnedTotal.toLocaleString()}`} hint="all time" />
        <Stat label="Total spent" value={`-${spentTotal.toLocaleString()}`} hint="all time" />
      </section>

      {/* Earn rates */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Earn rates</h2>
        <p className="mt-1 text-sm text-zinc-500">
          What users get from the platform and from their referrals.
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/30">
              <tr>
                <th className="px-4 py-3 text-start">Plan</th>
                <th className="px-4 py-3 text-end">Welcome bonus</th>
                <th className="px-4 py-3 text-end">Referrer earns</th>
                <th className="px-4 py-3 text-end">Plan price (EGP)</th>
                <th className="px-4 py-3 text-end">Effective commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {PLANS.map((p) => {
                const cfg = PLAN_LIMITS[p];
                const welcome = SIGNUP_BONUS_CREDITS[p];
                const commission = REFERRAL_COMMISSION_CREDITS[p];
                const pct =
                  cfg.priceMonthly > 0
                    ? Math.round((commission / cfg.priceMonthly) * 1000) / 10
                    : 0;
                return (
                  <tr key={p}>
                    <td className="px-4 py-3 font-medium">{cfg.label}</td>
                    <td className="px-4 py-3 text-end font-mono">{welcome}</td>
                    <td className="px-4 py-3 text-end font-mono">{commission}</td>
                    <td className="px-4 py-3 text-end font-mono">{cfg.priceMonthly.toLocaleString()}</td>
                    <td className="px-4 py-3 text-end font-mono text-zinc-500">
                      {commission > 0 ? `${pct}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Welcome bonus is awarded once on signup. Referral commission is awarded once per referee
          on their <em>first</em> paid order (no farming via repeated subscriptions).
        </p>
      </section>

      {/* Redemption rates */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Redemption rates</h2>
        <p className="mt-1 text-sm text-zinc-500">What users can spend credits on.</p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/30">
              <tr>
                <th className="px-4 py-3 text-start">Redemption</th>
                <th className="px-4 py-3 text-end">Cost</th>
                <th className="px-4 py-3 text-start">Where</th>
                <th className="px-4 py-3 text-start">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              <tr>
                <td className="px-4 py-3 font-medium">Discount on plan purchase</td>
                <td className="px-4 py-3 text-end font-mono">1 EGP off / credit</td>
                <td className="px-4 py-3 text-xs text-zinc-500">Vodafone Cash / Instapay checkout</td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  Capped at {Math.round(MAX_CREDITS_DISCOUNT_FRACTION * 100)}% of order amount
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">+1 bonus question</td>
                <td className="px-4 py-3 text-end font-mono">{CREDITS_PER_BONUS_QUESTION} credits</td>
                <td className="px-4 py-3 text-xs text-zinc-500">/account/subscription</td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  Perpetual pool — never expires; drains only when monthly plan quota is exceeded
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">+1 bonus file upload</td>
                <td className="px-4 py-3 text-end font-mono">{CREDITS_PER_BONUS_FILE} credits</td>
                <td className="px-4 py-3 text-xs text-zinc-500">/account/subscription</td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  Perpetual pool — never expires
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Earned/spent by type */}
      <section className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-semibold">Earned, by source</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {earnedByType.length === 0 ? (
              <li className="text-zinc-500">No earnings yet.</li>
            ) : (
              earnedByType.map((row) => (
                <li key={row.type} className="flex items-baseline justify-between">
                  <span className="text-zinc-600 dark:text-zinc-300">{prettyType(row.type)}</span>
                  <span className="font-mono">
                    +{(row._sum.amount ?? 0).toLocaleString()}
                    <span className="ml-2 text-xs text-zinc-500">×{row._count}</span>
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-semibold">Spent, by use</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {spentByType.length === 0 ? (
              <li className="text-zinc-500">Nothing spent yet.</li>
            ) : (
              spentByType.map((row) => (
                <li key={row.type} className="flex items-baseline justify-between">
                  <span className="text-zinc-600 dark:text-zinc-300">{prettyType(row.type)}</span>
                  <span className="font-mono">
                    {(row._sum.amount ?? 0).toLocaleString()}
                    <span className="ml-2 text-xs text-zinc-500">×{row._count}</span>
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      {/* Top referrers */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Top referrers</h2>
        <p className="mt-1 text-sm text-zinc-500">Users earning the most via referral commissions.</p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {topReferrers.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-500">No referral commissions yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/30">
                <tr>
                  <th className="px-4 py-3 text-start">User</th>
                  <th className="px-4 py-3 text-end">Successful referrals</th>
                  <th className="px-4 py-3 text-end">Credits earned</th>
                  <th className="px-4 py-3 text-end">Current balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {topReferrers.map((row) => {
                  const u = userById.get(row.userId);
                  return (
                    <tr key={row.userId}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/users/${row.userId}`}
                          className="font-medium hover:text-blue-600"
                        >
                          {u?.name ?? u?.email ?? row.userId}
                        </Link>
                        {u?.email && (
                          <div className="text-xs text-zinc-500">{u.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-end font-mono">{row._count}</td>
                      <td className="px-4 py-3 text-end font-mono text-emerald-700">
                        +{(row._sum.amount ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-end font-mono">
                        {(u?.creditsBalance ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Recent transactions */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {recentTx.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-500">No transactions yet.</div>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {recentTx.map((tx) => (
                <li key={tx.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium">
                      <Link
                        href={`/admin/users/${tx.user.id}`}
                        className="hover:text-blue-600"
                      >
                        {tx.user.name ?? tx.user.email}
                      </Link>{" "}
                      <span className="text-zinc-500">— {prettyType(tx.type)}</span>
                    </div>
                    {tx.description && (
                      <div className="mt-0.5 text-xs text-zinc-500">{tx.description}</div>
                    )}
                    <div className="mt-0.5 text-xs text-zinc-400">{tx.createdAt.toLocaleString()}</div>
                  </div>
                  <div
                    className={`shrink-0 font-mono font-semibold ${
                      tx.amount > 0 ? "text-emerald-700" : "text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs">{label}</div>
      <div className="mt-2 text-xl font-semibold sm:text-2xl">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{hint}</div>
    </div>
  );
}

function prettyType(type: string): string {
  switch (type) {
    case "signup_bonus":
      return "Welcome bonus";
    case "referral_commission":
      return "Referral commission";
    case "redemption_discount":
      return "Plan discount";
    case "redemption_refund":
      return "Refund";
    case "redemption_questions":
      return "Bonus questions";
    case "redemption_files":
      return "Bonus file uploads";
    case "manual_adjust":
      return "Manual adjustment";
    default:
      return type;
  }
}
