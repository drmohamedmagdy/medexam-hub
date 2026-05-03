import Link from "next/link";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";

export const metadata = { title: "Admin — Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const planFilter = sp.plan;

  const where: Parameters<typeof prisma.user.findMany>[0] extends infer P
    ? P extends { where?: infer W }
      ? W
      : never
    : never = {};
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }
  if (planFilter && ["FREE", "BASIC", "PRO", "PREMIUM"].includes(planFilter)) {
    where.plan = planFilter as "FREE" | "BASIC" | "PRO" | "PREMIUM";
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      planExpiresAt: true,
      planCancelledAt: true,
      createdAt: true,
      _count: { select: { exams: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {users.length} {users.length === 1 ? "user" : "users"} shown (max 100)
      </p>

      <form className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search email or name…"
          className="w-72 rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          name="plan"
          defaultValue={planFilter ?? ""}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">All plans</option>
          <option value="FREE">Free</option>
          <option value="BASIC">Basic</option>
          <option value="PRO">Pro</option>
          <option value="PREMIUM">Premium</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Filter
        </button>
        <Link
          href="/admin/users"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Reset
        </Link>
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {users.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">No users match.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/30">
              <tr>
                <th className="px-4 py-3 text-start">User</th>
                <th className="px-4 py-3 text-start">Plan</th>
                <th className="px-4 py-3 text-end">Exams</th>
                <th className="px-4 py-3 text-start">Joined</th>
                <th className="px-4 py-3 text-start">Plan status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {users.map((u) => {
                const expired = u.planExpiresAt && u.planExpiresAt < new Date();
                const cancelled = !!u.planCancelledAt;
                let status = "Active";
                let statusColor = "text-emerald-700";
                if (u.plan === "FREE") {
                  status = "Free";
                  statusColor = "text-zinc-500";
                } else if (expired) {
                  status = "Expired";
                  statusColor = "text-red-700";
                } else if (cancelled) {
                  status = "Cancelled";
                  statusColor = "text-amber-700";
                }
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="font-medium hover:text-blue-600"
                      >
                        {u.name ?? u.email}
                      </Link>
                      <div className="text-xs text-zinc-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium dark:bg-zinc-800">
                        {PLAN_LIMITS[u.plan].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end font-mono">{u._count.exams}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {u.createdAt.toLocaleDateString()}
                    </td>
                    <td className={`px-4 py-3 text-xs ${statusColor}`}>{status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
