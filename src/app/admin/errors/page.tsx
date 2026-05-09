import Link from "next/link";
import { prisma } from "@/lib/db";

export const metadata = { title: "Admin — Errors" };

const PAGE_SIZE = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

export default async function AdminErrorsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; route?: string; digest?: string }>;
}) {
  const sp = await searchParams;
  const pageNum = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const routeFilter = (sp.route ?? "").trim() || null;
  const digestFilter = (sp.digest ?? "").trim() || null;

  const where: Parameters<typeof prisma.errorLog.findMany>[0] extends infer P
    ? P extends { where?: infer W }
      ? W
      : never
    : never = {};
  if (routeFilter) where.route = { contains: routeFilter, mode: "insensitive" };
  if (digestFilter) where.digest = digestFilter;

  const now = new Date();
  const dayAgo = new Date(now.getTime() - DAY_MS);
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);

  const [total, last24h, last7d, errors, topDigests] = await Promise.all([
    prisma.errorLog.count({ where }),
    prisma.errorLog.count({ where: { ...where, createdAt: { gte: dayAgo } } }),
    prisma.errorLog.count({ where: { ...where, createdAt: { gte: weekAgo } } }),
    prisma.errorLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        message: true,
        route: true,
        digest: true,
        stack: true,
        createdAt: true,
        userId: true,
        user: { select: { email: true, name: true } },
      },
    }),
    // Most-frequent digests in the last 7 days — gives the admin a "fix
    // these first" shortlist instead of forcing them to scroll.
    prisma.errorLog.groupBy({
      by: ["digest"],
      where: { createdAt: { gte: weekAgo }, digest: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { digest: "desc" } },
      take: 5,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(pageNum, totalPages);

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (routeFilter) params.set("route", routeFilter);
    if (digestFilter) params.set("digest", digestFilter);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/errors?${qs}` : "/admin/errors";
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Errors</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {total === 0
          ? "No errors logged."
          : `${total} total · ${last24h} in the last 24h · ${last7d} in the last 7 days`}
      </p>

      {(routeFilter || digestFilter) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-zinc-500">Filters:</span>
          {routeFilter && (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
              route ~ {routeFilter}
            </span>
          )}
          {digestFilter && (
            <span className="rounded-full bg-violet-100 px-3 py-1 font-mono text-violet-800 dark:bg-violet-950 dark:text-violet-200">
              digest = {digestFilter}
            </span>
          )}
          <Link
            href="/admin/errors"
            className="rounded-full border border-zinc-300 px-3 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Clear
          </Link>
        </div>
      )}

      {topDigests.length > 0 && !routeFilter && !digestFilter && (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Top recurring errors (7d)
          </h2>
          <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
            {topDigests.map((d) => (
              <li
                key={d.digest ?? "null"}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <Link
                  href={`/admin/errors?digest=${encodeURIComponent(d.digest ?? "")}`}
                  className="truncate font-mono text-xs text-blue-600 hover:underline dark:text-cyan-400"
                >
                  {d.digest}
                </Link>
                <span className="shrink-0 font-mono text-xs text-zinc-500">
                  {d._count._all}×
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {errors.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            No errors match.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {errors.map((e) => (
              <li key={e.id} className="p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span>{e.createdAt.toLocaleString()}</span>
                  {e.route && (
                    <Link
                      href={`/admin/errors?route=${encodeURIComponent(e.route)}`}
                      className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 hover:underline dark:bg-blue-950/40 dark:text-blue-300"
                    >
                      {e.route}
                    </Link>
                  )}
                  {e.digest && (
                    <Link
                      href={`/admin/errors?digest=${encodeURIComponent(e.digest)}`}
                      className="rounded-full bg-violet-50 px-2 py-0.5 font-mono text-violet-700 hover:underline dark:bg-violet-950/40 dark:text-violet-300"
                    >
                      {e.digest}
                    </Link>
                  )}
                  {e.userId && (
                    <Link
                      href={`/admin/users/${e.userId}`}
                      className="rounded-full bg-zinc-100 px-2 py-0.5 hover:underline dark:bg-zinc-800"
                    >
                      {e.user?.name?.trim() ||
                        e.user?.email ||
                        e.userId.slice(0, 8)}
                    </Link>
                  )}
                </div>
                <p className="mt-1.5 font-medium text-red-700 dark:text-red-400">
                  {e.message}
                </p>
                {e.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                      Stack trace
                    </summary>
                    <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-zinc-100 p-3 font-mono text-[11px] text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                      {e.stack}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
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
