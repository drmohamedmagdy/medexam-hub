import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { reviewAmbassadorApplicationAction } from "@/app/actions/ambassador";

export const metadata = { title: "Admin — Ambassadors" };

export default async function AdminAmbassadorsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const status = sp.status;

  const apps = await prisma.ambassadorApplication.findMany({
    where:
      status === "PENDING" || status === "APPROVED" || status === "REJECTED"
        ? { status }
        : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const pendingCount = await prisma.ambassadorApplication.count({
    where: { status: "PENDING" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Ambassador applications
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {pendingCount} pending · {apps.length} shown
      </p>

      <nav className="mt-6 flex flex-wrap gap-2 text-sm">
        <FilterChip href="/admin/ambassadors" active={!status} label="All" />
        <FilterChip
          href="/admin/ambassadors?status=PENDING"
          active={status === "PENDING"}
          label={`Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
        />
        <FilterChip
          href="/admin/ambassadors?status=APPROVED"
          active={status === "APPROVED"}
          label="Approved"
        />
        <FilterChip
          href="/admin/ambassadors?status=REJECTED"
          active={status === "REJECTED"}
          label="Rejected"
        />
      </nav>

      <div className="mt-6 space-y-4">
        {apps.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
            No applications.
          </div>
        ) : (
          apps.map((a) => (
            <article
              key={a.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">
                    {a.name}{" "}
                    <span className="text-xs font-normal text-zinc-500">
                      · {a.medicalSchool} · {a.yearOfStudy}
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-500">
                    <a href={`mailto:${a.email}`} className="hover:underline">
                      {a.email}
                    </a>
                    {a.phone && <> · {a.phone}</>}
                  </p>
                  {a.socialLinks && (
                    <p className="mt-1 text-xs text-zinc-500">
                      Social: {a.socialLinks}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Applied {a.createdAt.toLocaleString()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.status === "APPROVED"
                      ? "bg-emerald-100 text-emerald-800"
                      : a.status === "REJECTED"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {a.status.toLowerCase()}
                </span>
              </header>

              <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {a.motivation}
              </p>

              {a.reviewerNotes && (
                <p className="mt-3 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
                  <strong>Reviewer notes:</strong> {a.reviewerNotes}
                </p>
              )}

              {a.status === "PENDING" && (
                <form
                  action={reviewAmbassadorApplicationAction}
                  className="mt-4 flex flex-wrap items-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800"
                >
                  <input type="hidden" name="id" value={a.id} />
                  <div className="flex-1 min-w-[200px]">
                    <label
                      htmlFor={`notes-${a.id}`}
                      className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                    >
                      Notes (optional)
                    </label>
                    <input
                      id={`notes-${a.id}`}
                      type="text"
                      name="notes"
                      placeholder="Reason / next steps"
                      className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  </div>
                  <button
                    type="submit"
                    name="decision"
                    value="APPROVED"
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="REJECTED"
                    className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    Reject
                  </button>
                </form>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 ${
        active
          ? "border-blue-500 bg-blue-50 text-blue-700"
          : "border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      }`}
    >
      {label}
    </Link>
  );
}
