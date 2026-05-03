import Link from "next/link";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import type { Plan } from "@/generated/prisma/client";

export const metadata = { title: "Admin — Overview" };

const DAY = 24 * 60 * 60 * 1000;

export default async function AdminOverview() {
  const now = new Date();
  const day1 = new Date(now.getTime() - 1 * DAY);
  const day7 = new Date(now.getTime() - 7 * DAY);
  const day30 = new Date(now.getTime() - 30 * DAY);

  const [
    totalUsers,
    usersToday,
    usersThisWeek,
    usersThisMonth,
    totalExams,
    examsThisWeek,
    completedExams,
    totalRevenueAgg,
    paidOrders,
    planCounts,
    recentSignups,
    recentPayments,
    activeWeekUserIds,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: day1 } } }),
    prisma.user.count({ where: { createdAt: { gte: day7 } } }),
    prisma.user.count({ where: { createdAt: { gte: day30 } } }),
    prisma.exam.count(),
    prisma.exam.count({ where: { createdAt: { gte: day7 } } }),
    prisma.exam.count({ where: { status: "COMPLETED" } }),
    prisma.paymentOrder.aggregate({
      where: { status: "PAID" },
      _sum: { amountCents: true },
    }),
    prisma.paymentOrder.count({ where: { status: "PAID" } }),
    prisma.user.groupBy({
      by: ["plan"],
      _count: true,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, email: true, name: true, plan: true, createdAt: true },
    }),
    prisma.paymentOrder.findMany({
      where: { status: "PAID" },
      orderBy: { paidAt: "desc" },
      take: 8,
      include: { user: { select: { email: true, name: true } } },
    }),
    prisma.authSession.findMany({
      where: { createdAt: { gte: day7 } },
      distinct: ["userId"],
      select: { userId: true },
    }),
  ]);

  const totalRevenueEgp = (totalRevenueAgg._sum.amountCents ?? 0) / 100;
  const planCountMap = Object.fromEntries(
    planCounts.map((p) => [p.plan, p._count])
  ) as Record<Plan, number>;
  const activeThisWeek = activeWeekUserIds.length;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Live snapshot of your MedExam Hub instance.
      </p>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total users" value={totalUsers.toLocaleString()} hint={`+${usersThisWeek} this week`} />
        <Stat label="Active this week" value={activeThisWeek.toLocaleString()} hint="distinct sessions" />
        <Stat label="Total exams" value={totalExams.toLocaleString()} hint={`${completedExams.toLocaleString()} completed`} />
        <Stat label="Revenue (paid)" value={`${totalRevenueEgp.toLocaleString()} EGP`} hint={`${paidOrders} paid orders`} />
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="New today" value={String(usersToday)} hint="signups in last 24h" />
        <Stat label="New this week" value={String(usersThisWeek)} hint="last 7 days" />
        <Stat label="New this month" value={String(usersThisMonth)} hint="last 30 days" />
        <Stat label="Exams this week" value={String(examsThisWeek)} hint="generated in 7d" />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Plan distribution</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(["FREE", "BASIC", "PRO", "PREMIUM"] as Plan[]).map((p) => (
            <div
              key={p}
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {PLAN_LIMITS[p].label}
              </div>
              <div className="mt-2 text-2xl font-semibold">{(planCountMap[p] ?? 0).toLocaleString()}</div>
              <div className="mt-1 text-xs text-zinc-500">
                {PLAN_LIMITS[p].priceMonthly === 0
                  ? "Free trial"
                  : `${PLAN_LIMITS[p].priceMonthly} EGP/mo`}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Recent signups</h2>
          <div className="mt-3 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {recentSignups.length === 0 ? (
              <div className="p-6 text-center text-sm text-zinc-500">No users yet.</div>
            ) : (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {recentSignups.map((u) => (
                  <li key={u.id} className="flex items-center justify-between p-4 text-sm">
                    <div>
                      <Link href={`/admin/users/${u.id}`} className="font-medium hover:text-blue-600">
                        {u.name ?? u.email}
                      </Link>
                      <div className="text-xs text-zinc-500">{u.email}</div>
                    </div>
                    <div className="text-right">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium dark:bg-zinc-800">
                        {PLAN_LIMITS[u.plan].label}
                      </span>
                      <div className="mt-1 text-xs text-zinc-500">
                        {u.createdAt.toLocaleString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Recent payments</h2>
          <div className="mt-3 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {recentPayments.length === 0 ? (
              <div className="p-6 text-center text-sm text-zinc-500">No paid orders yet.</div>
            ) : (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {recentPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between p-4 text-sm">
                    <div>
                      <div className="font-medium">{p.user.name ?? p.user.email}</div>
                      <div className="text-xs text-zinc-500">
                        {PLAN_LIMITS[p.plan].label} · {p.user.email}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">
                        {(p.amountCents / 100).toLocaleString()} {p.currency}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {p.paidAt?.toLocaleString() ?? p.createdAt.toLocaleString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{hint}</div>
    </div>
  );
}
