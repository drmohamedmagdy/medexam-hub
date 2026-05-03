import Link from "next/link";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";

export const metadata = { title: "Admin — Payments" };

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status;

  const payments = await prisma.paymentOrder.findMany({
    where:
      status === "PAID" || status === "PENDING" || status === "FAILED"
        ? { status: status as "PAID" | "PENDING" | "FAILED" }
        : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true, name: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
      <p className="mt-1 text-sm text-zinc-500">{payments.length} shown (max 100)</p>

      <nav className="mt-4 flex gap-2 text-sm">
        <Link
          href="/admin/payments"
          className={`rounded-full border px-3 py-1 ${!status ? "border-blue-500 bg-blue-50 text-blue-700" : "border-zinc-300"}`}
        >
          All
        </Link>
        <Link
          href="/admin/payments?status=PAID"
          className={`rounded-full border px-3 py-1 ${status === "PAID" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-zinc-300"}`}
        >
          Paid
        </Link>
        <Link
          href="/admin/payments?status=PENDING"
          className={`rounded-full border px-3 py-1 ${status === "PENDING" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-zinc-300"}`}
        >
          Pending
        </Link>
        <Link
          href="/admin/payments?status=FAILED"
          className={`rounded-full border px-3 py-1 ${status === "FAILED" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-zinc-300"}`}
        >
          Failed
        </Link>
      </nav>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {payments.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">No payments.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/30">
              <tr>
                <th className="px-4 py-3 text-start">Date</th>
                <th className="px-4 py-3 text-start">User</th>
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
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${p.userId}`}
                      className="font-medium hover:text-blue-600"
                    >
                      {p.user.name ?? p.user.email}
                    </Link>
                    <div className="text-xs text-zinc-500">{p.user.email}</div>
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
        )}
      </div>
    </div>
  );
}
