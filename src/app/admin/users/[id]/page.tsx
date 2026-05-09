import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import { getMonthlyExamUsage } from "@/lib/quota";
import PlanControls from "./PlanControls";

export const metadata = { title: "Admin — User" };

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { exams: true, payments: true } },
    },
  });
  if (!user) notFound();

  const [exams, payments, quota, recentSessions] = await Promise.all([
    prisma.exam.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true, title: true, status: true, scorePct: true,
        numQuestions: true, createdAt: true, submittedAt: true,
      },
    }),
    prisma.paymentOrder.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getMonthlyExamUsage(user.id, user.plan),
    prisma.authSession.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { createdAt: true, expiresAt: true },
    }),
  ]);

  const completed = exams.filter((e) => e.scorePct !== null);
  const avgScore =
    completed.length === 0
      ? null
      : Math.round(completed.reduce((s, e) => s + (e.scorePct ?? 0), 0) / completed.length);

  const planCfg = PLAN_LIMITS[user.plan];
  const expired = !!user.planExpiresAt && user.planExpiresAt < new Date();
  const cancelled = !!user.planCancelledAt;

  return (
    <div>
      <Link href="/admin/users" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; Back to users
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{user.name ?? user.email}</h1>
      <p className="mt-1 text-sm text-zinc-500">{user.email}</p>

      {/* User summary */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Current plan" value={planCfg.label} hint={`${planCfg.priceMonthly} EGP/mo`} />
        <Stat
          label="Plan expiry"
          value={user.planExpiresAt ? user.planExpiresAt.toLocaleDateString() : "—"}
          hint={expired ? "Expired" : cancelled ? "Cancelled (won't renew)" : "Active"}
        />
        <Stat
          label="Exams this month"
          value={`${quota.used} / ${quota.limit}`}
          hint={`${quota.remaining} remaining`}
        />
        <Stat
          label="Average score"
          value={avgScore === null ? "—" : `${avgScore}%`}
          hint={`${completed.length} of ${user._count.exams} completed`}
        />
      </section>

      {/* Account details */}
      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Account details
        </h2>
        <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <Row label="Joined" value={user.createdAt.toLocaleString()} />
          <Row label="Last update" value={user.updatedAt.toLocaleString()} />
          <Row
            label="Plan started"
            value={user.planStartedAt ? user.planStartedAt.toLocaleString() : "—"}
          />
          <Row
            label="Plan expires"
            value={user.planExpiresAt ? user.planExpiresAt.toLocaleString() : "—"}
          />
          <Row
            label="Plan cancelled at"
            value={user.planCancelledAt ? user.planCancelledAt.toLocaleString() : "—"}
          />
          <Row
            label="Last session"
            value={recentSessions[0]?.createdAt.toLocaleString() ?? "Never"}
          />
        </dl>
      </section>

      {/* Plan controls */}
      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Plan controls
        </h2>
        <PlanControls userId={user.id} currentPlan={user.plan} userEmail={user.email} />
      </section>

      {/* Exams */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Recent exams ({user._count.exams} total)</h2>
        <div className="mt-3 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {exams.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-500">No exams.</div>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {exams.map((e) => (
                <li key={e.id} className="flex items-center justify-between p-4 text-sm">
                  <div>
                    <div className="font-medium">{e.title}</div>
                    <div className="text-xs text-zinc-500">
                      {e.numQuestions} Q · {e.status.toLowerCase().replace("_", " ")} · {e.createdAt.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    {e.scorePct !== null ? `${Math.round(e.scorePct)}%` : "—"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Payments */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Payment history ({user._count.payments} total)</h2>
        <div className="mt-3 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {payments.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-500">No payments.</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/30">
                <tr>
                  <th className="px-4 py-3 text-start">Date</th>
                  <th className="px-4 py-3 text-start">Plan</th>
                  <th className="px-4 py-3 text-end">Amount</th>
                  <th className="px-4 py-3 text-end">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-xs">
                      {p.paidAt?.toLocaleString() ?? p.createdAt.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{PLAN_LIMITS[p.plan].label}</td>
                    <td className="px-4 py-3 text-end font-mono">
                      {(p.amountCents / 100).toLocaleString()} {p.currency}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800"
                            : p.status === "FAILED"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {p.status.toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{hint}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
