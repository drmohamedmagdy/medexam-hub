import Link from "next/link";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import type { Plan } from "@/generated/prisma/client";

export const metadata = { title: "Admin — Revenue" };

// Operator-facing revenue dashboard. Shows MRR, ARR, paid-user counts,
// last-30-day cash, churn-adjacent metrics (cancelled but not expired,
// expired in last 30d, refunds), and a per-plan / per-method breakdown.
//
// Numbers are recomputed from PaymentOrder + User on every request.
// At scale (10k+ paid users) this gets slow — at that point we cache
// MRR snapshots in a daily-rolled table. For now the live query is fast
// enough and we trade speed for "always exactly accurate".

const PAID_PLANS: Plan[] = ["BASIC", "PRO", "PREMIUM", "RESEARCHER"];
const DAY_MS = 24 * 60 * 60 * 1000;

function fmtEgp(cents: number): string {
  return `${(cents / 100).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })} EGP`;
}

export default async function AdminRevenuePage() {
  const now = new Date();
  const start30 = new Date(now.getTime() - 30 * DAY_MS);
  const start90 = new Date(now.getTime() - 90 * DAY_MS);

  const [
    activePaidUsers,
    activeByPlan,
    paidOrders30d,
    paidOrders30dAgg,
    paidOrders90dAgg,
    refunds30d,
    expired30d,
    cancelledActive,
    newSubs30d,
    methodSplit30d,
    cycleSplit30d,
    paidOrdersAllTime,
  ] = await Promise.all([
    // 1. Currently active paid users — plan in paid set AND not expired.
    prisma.user.count({
      where: {
        plan: { in: PAID_PLANS },
        OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }],
      },
    }),
    // 2. Active paid users broken down by plan.
    prisma.user.groupBy({
      by: ["plan"],
      where: {
        plan: { in: PAID_PLANS },
        OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }],
      },
      _count: { _all: true },
    }),
    // 3. PAID orders in the last 30 days (count).
    prisma.paymentOrder.count({
      where: {
        status: "PAID",
        topupKind: null,
        paidAt: { gte: start30 },
      },
    }),
    // 4. Sum of amount in 30 days.
    prisma.paymentOrder.aggregate({
      where: {
        status: "PAID",
        topupKind: null,
        paidAt: { gte: start30 },
      },
      _sum: { amountCents: true },
    }),
    // 5. Sum over 90 days (for trend comparison).
    prisma.paymentOrder.aggregate({
      where: {
        status: "PAID",
        topupKind: null,
        paidAt: { gte: start90 },
      },
      _sum: { amountCents: true },
    }),
    // 6. Refunds in the last 30 days.
    prisma.paymentOrder.aggregate({
      where: {
        status: "REFUNDED",
        reviewedAt: { gte: start30 },
      },
      _count: { _all: true },
      _sum: { amountCents: true },
    }),
    // 7. Users whose plan expired in last 30 days (churn proxy).
    prisma.user.count({
      where: {
        planExpiresAt: { gte: start30, lt: now },
      },
    }),
    // 8. Users with planCancelledAt set but plan still active (will churn).
    prisma.user.count({
      where: {
        planCancelledAt: { not: null },
        plan: { in: PAID_PLANS },
        planExpiresAt: { gt: now },
      },
    }),
    // 9. New subscribers in the last 30 days — count distinct users with
    //    their first PAID plan order in the window.
    prisma.paymentOrder.findMany({
      where: {
        status: "PAID",
        topupKind: null,
      },
      orderBy: { paidAt: "asc" },
      select: { userId: true, paidAt: true },
    }),
    // 10. Payment method split, last 30 days.
    prisma.paymentOrder.groupBy({
      by: ["paymentMethod"],
      where: {
        status: "PAID",
        topupKind: null,
        paidAt: { gte: start30 },
      },
      _count: { _all: true },
      _sum: { amountCents: true },
    }),
    // 11. Cycle split — how many users went 1mo vs 12mo etc.
    prisma.paymentOrder.groupBy({
      by: ["durationMonths"],
      where: {
        status: "PAID",
        topupKind: null,
        paidAt: { gte: start30 },
      },
      _count: { _all: true },
      _sum: { amountCents: true },
    }),
    // 12. Lifetime PAID order count (for the all-time stat).
    prisma.paymentOrder.aggregate({
      where: { status: "PAID", topupKind: null },
      _count: { _all: true },
      _sum: { amountCents: true },
    }),
  ]);

  // Estimated MRR — sum of (activeByPlan_count × plan_priceMonthly).
  // This counts annual subscribers at their full monthly rate; if you
  // want strict "cash MRR" use paidOrders30d total / 1 instead.
  const planByKey = Object.fromEntries(
    activeByPlan.map((row) => [row.plan, row._count._all])
  );
  const mrrEgp = PAID_PLANS.reduce(
    (sum, p) => sum + (planByKey[p] ?? 0) * PLAN_LIMITS[p].priceMonthly,
    0
  );
  const arrEgp = mrrEgp * 12;

  // First-paid-order date per user → count distinct users whose first
  // PAID order is in the last 30 days. Cheaper to do in JS than another
  // groupBy query.
  const firstPaidByUser = new Map<string, Date>();
  for (const o of newSubs30d) {
    if (!o.paidAt) continue;
    const cur = firstPaidByUser.get(o.userId);
    if (!cur || o.paidAt < cur) firstPaidByUser.set(o.userId, o.paidAt);
  }
  let newSubsCount = 0;
  for (const d of firstPaidByUser.values()) {
    if (d >= start30) newSubsCount += 1;
  }

  const cash30 = paidOrders30dAgg._sum.amountCents ?? 0;
  const cash90 = paidOrders90dAgg._sum.amountCents ?? 0;
  const prior60 = cash90 - cash30;
  const trend =
    prior60 === 0 ? null : Math.round(((cash30 / (prior60 / 2)) - 1) * 100);

  // Churn rate (last 30d) — expired / active at start of window.
  // Imperfect (doesn't account for users who renewed back) but useful.
  const churnRatePct =
    activePaidUsers + expired30d > 0
      ? Math.round((expired30d / (activePaidUsers + expired30d)) * 100)
      : 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Revenue</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Live numbers — recomputed on every load.
      </p>

      {/* Headline cards */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="MRR (active)" value={fmtEgp(mrrEgp * 100)} hint={`ARR ${fmtEgp(arrEgp * 100)}`} accent="emerald" />
        <Card
          label="Cash, last 30 days"
          value={fmtEgp(cash30)}
          hint={trend !== null ? `${trend > 0 ? "+" : ""}${trend}% vs prior 60d avg` : "—"}
          accent="blue"
        />
        <Card
          label="Active paid users"
          value={String(activePaidUsers)}
          hint={`${newSubsCount} new in 30d`}
          accent="violet"
        />
        <Card
          label="Churn rate, 30d"
          value={`${churnRatePct}%`}
          hint={`${expired30d} expired, ${cancelledActive} cancelled-pending`}
          accent="amber"
        />
      </section>

      {/* Plan distribution */}
      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Active subs by plan
        </h2>
        <ul className="mt-4 space-y-2">
          {PAID_PLANS.map((p) => {
            const count = planByKey[p] ?? 0;
            const monthlyContribution = count * PLAN_LIMITS[p].priceMonthly;
            const share = mrrEgp > 0 ? Math.round((monthlyContribution / mrrEgp) * 100) : 0;
            return (
              <li key={p} className="flex items-center gap-3 text-sm">
                <span className="w-32 font-medium">{PLAN_LIMITS[p].label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div className="h-full bg-blue-500" style={{ width: `${share}%` }} />
                </div>
                <span className="w-20 text-end font-mono text-xs">{count}</span>
                <span className="w-28 text-end font-mono text-xs text-zinc-500">
                  {fmtEgp(monthlyContribution * 100)}/mo
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Method + cycle splits */}
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Payment method, last 30d
          </h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="py-2 text-start">Method</th>
                <th className="py-2 text-end">Orders</th>
                <th className="py-2 text-end">Cash</th>
              </tr>
            </thead>
            <tbody>
              {methodSplit30d.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-3 text-center text-zinc-500">
                    No orders in window.
                  </td>
                </tr>
              ) : (
                methodSplit30d.map((row) => (
                  <tr key={row.paymentMethod}>
                    <td className="py-2">{row.paymentMethod}</td>
                    <td className="py-2 text-end font-mono">{row._count._all}</td>
                    <td className="py-2 text-end font-mono">
                      {fmtEgp(row._sum.amountCents ?? 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Billing cycle, last 30d
          </h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="py-2 text-start">Period</th>
                <th className="py-2 text-end">Orders</th>
                <th className="py-2 text-end">Cash</th>
              </tr>
            </thead>
            <tbody>
              {cycleSplit30d.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-3 text-center text-zinc-500">
                    No orders in window.
                  </td>
                </tr>
              ) : (
                cycleSplit30d
                  .sort((a, b) => a.durationMonths - b.durationMonths)
                  .map((row) => (
                    <tr key={row.durationMonths}>
                      <td className="py-2">
                        {row.durationMonths === 1
                          ? "Monthly"
                          : row.durationMonths === 12
                            ? "Annual"
                            : `${row.durationMonths} months`}
                      </td>
                      <td className="py-2 text-end font-mono">{row._count._all}</td>
                      <td className="py-2 text-end font-mono">
                        {fmtEgp(row._sum.amountCents ?? 0)}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Refunds + all-time totals */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Refunds, last 30d
          </h2>
          <p className="mt-3 text-2xl font-bold">
            {refunds30d._count._all}{" "}
            <span className="text-sm font-normal text-zinc-500">orders</span>
          </p>
          <p className="text-sm text-zinc-500">{fmtEgp(refunds30d._sum.amountCents ?? 0)} refunded</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            All-time
          </h2>
          <p className="mt-3 text-2xl font-bold">
            {paidOrdersAllTime._count._all}{" "}
            <span className="text-sm font-normal text-zinc-500">paid orders</span>
          </p>
          <p className="text-sm text-zinc-500">
            {fmtEgp(paidOrdersAllTime._sum.amountCents ?? 0)} total cash
          </p>
        </div>
      </section>

      <p className="mt-8 text-xs text-zinc-500">
        Need more detail?{" "}
        <Link href="/admin/payments" className="text-blue-600 hover:underline">
          Inspect individual orders →
        </Link>
      </p>
    </div>
  );
}

function Card({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: "emerald" | "blue" | "violet" | "amber";
}) {
  const ring = {
    emerald: "from-emerald-500 to-emerald-700",
    blue: "from-blue-500 to-blue-700",
    violet: "from-violet-500 to-violet-700",
    amber: "from-amber-500 to-amber-700",
  }[accent];
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${ring} p-5 text-white shadow`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
      {hint && <p className="mt-1 text-xs opacity-90">{hint}</p>}
    </div>
  );
}
