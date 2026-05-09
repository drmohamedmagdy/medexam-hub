import Link from "next/link";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";

export const metadata = { title: "Admin — Users" };

const PAGE_SIZE = 100;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const planFilter = sp.plan;
  const pageNum = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

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
  if (planFilter && ["FREE", "BASIC", "PRO", "PREMIUM", "RESEARCHER"].includes(planFilter)) {
    where.plan = planFilter as "FREE" | "BASIC" | "PRO" | "PREMIUM" | "RESEARCHER";
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
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
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(pageNum, totalPages);
  const startIdx = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIdx = (safePage - 1) * PAGE_SIZE + users.length;

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (planFilter) params.set("plan", planFilter);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {total === 0
          ? "No users"
          : `Showing ${startIdx}–${endIdx} of ${total}`}
        {totalPages > 1 && ` · page ${safePage} of ${totalPages}`}
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
          <option value="RESEARCHER">Researcher</option>
        </select>
        {/* Filter changes always reset back to page 1 — leave the page
            field out so the form submission lands on /admin/users?q=…&plan=… */}
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
          <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
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
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <nav
          className="mt-4 flex items-center justify-between gap-3 text-sm"
          aria-label="Pagination"
        >
          {safePage > 1 ? (
            <Link
              href={pageHref(safePage - 1)}
              className="rounded-md border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              ← Previous
            </Link>
          ) : (
            <span className="rounded-md border border-zinc-200 px-4 py-2 text-zinc-400 dark:border-zinc-800">
              ← Previous
            </span>
          )}

          <span className="text-xs text-zinc-500">
            Page {safePage} of {totalPages}
          </span>

          {safePage < totalPages ? (
            <Link
              href={pageHref(safePage + 1)}
              className="rounded-md border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Next →
            </Link>
          ) : (
            <span className="rounded-md border border-zinc-200 px-4 py-2 text-zinc-400 dark:border-zinc-800">
              Next →
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
