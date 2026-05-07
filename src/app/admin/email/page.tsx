import Link from "next/link";
import { prisma } from "@/lib/db";
import BroadcastForm from "./BroadcastForm";

export const metadata = { title: "Admin — Email" };

export default async function AdminEmailPage() {
  const recent = await prisma.emailLog.findMany({
    orderBy: { sentAt: "desc" },
    take: 50,
    include: { user: { select: { email: true, name: true } } },
  });

  const counts = await prisma.user.groupBy({
    by: ["plan"],
    _count: true,
    where: { emailMarketing: true },
  });
  const totalOptIn = await prisma.user.count({ where: { emailMarketing: true } });
  const totalAll = await prisma.user.count();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Email broadcasts</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Compose and send to a user segment. {totalOptIn} of {totalAll} users have marketing opt-in.
      </p>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {(["FREE", "BASIC", "PRO", "PREMIUM", "RESEARCHER"] as const).map((plan) => {
          const c = counts.find((x) => x.plan === plan);
          return (
            <div
              key={plan}
              className="rounded-2xl border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{plan} (opt-in)</div>
              <div className="mt-1 text-2xl font-semibold">{c?._count ?? 0}</div>
            </div>
          );
        })}
      </section>

      <BroadcastForm />

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Recent sends</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {recent.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-500">No emails sent yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/30">
                <tr>
                  <th className="px-4 py-3 text-start">When</th>
                  <th className="px-4 py-3 text-start">Category</th>
                  <th className="px-4 py-3 text-start">Subject</th>
                  <th className="px-4 py-3 text-start">User</th>
                  <th className="px-4 py-3 text-start">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {recent.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3 text-xs">{e.sentAt.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs">{e.category}</td>
                    <td className="px-4 py-3 truncate max-w-[260px]">{e.subject}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${e.userId}`} className="hover:text-blue-600">
                        {e.user?.name ?? e.toEmail}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {e.error ? (
                        <span className="text-red-700" title={e.error}>failed</span>
                      ) : (
                        <span className="text-emerald-700">sent</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
