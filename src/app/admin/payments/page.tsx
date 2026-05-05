import Link from "next/link";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import {
  adminApprovePaymentAction,
  adminRejectPaymentAction,
} from "@/app/actions/manual-payment";

export const metadata = { title: "Admin — Payments" };

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; method?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status;
  const methodFilter = sp.method;

  // Manual payments awaiting review — these always show first.
  const pendingManual = await prisma.paymentOrder.findMany({
    where: {
      status: "PENDING",
      paymentMethod: { in: ["VODAFONE_CASH", "INSTAPAY"] },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: { user: { select: { email: true, name: true } } },
  });

  const payments = await prisma.paymentOrder.findMany({
    where: {
      ...(status === "PAID" || status === "PENDING" || status === "FAILED"
        ? { status: status as "PAID" | "PENDING" | "FAILED" }
        : {}),
      ...(methodFilter === "CARD" || methodFilter === "VODAFONE_CASH" || methodFilter === "INSTAPAY"
        ? { paymentMethod: methodFilter as "CARD" | "VODAFONE_CASH" | "INSTAPAY" }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true, name: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
      <p className="mt-1 text-sm text-zinc-500">{payments.length} shown (max 100)</p>

      {/* Pending manual review queue */}
      {pendingManual.length > 0 && (
        <section className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30 sm:p-5">
          <h2 className="text-base font-semibold text-amber-900 dark:text-amber-200">
            🔔 {pendingManual.length} manual payment{pendingManual.length === 1 ? "" : "s"} awaiting review
          </h2>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            Verify each transaction reference against your wallet / bank statement, then approve or reject.
          </p>
          <ul className="mt-4 space-y-3">
            {pendingManual.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-amber-200 bg-white p-4 dark:border-amber-900 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/users/${p.userId}`}
                      className="font-medium hover:text-blue-600"
                    >
                      {p.user.name ?? p.user.email}
                    </Link>
                    <div className="text-xs text-zinc-500">{p.user.email}</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {p.createdAt.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="text-sm font-semibold">{PLAN_LIMITS[p.plan].label}</div>
                    {p.originalCents && p.originalCents !== p.amountCents && (
                      <div className="font-mono text-xs text-zinc-400 line-through">
                        {(p.originalCents / 100).toLocaleString()} EGP
                      </div>
                    )}
                    <div className="font-mono text-base font-semibold">
                      {(p.amountCents / 100).toLocaleString()} EGP
                    </div>
                    {p.promoCodeUsed && (
                      <div className="mt-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                        with {p.promoCodeUsed}
                      </div>
                    )}
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.paymentMethod === "VODAFONE_CASH"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {p.paymentMethod === "VODAFONE_CASH" ? "📱 Vodafone Cash" : "⚡ Instapay"}
                    </span>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Verify the screenshot shows {(p.amountCents / 100).toLocaleString()} EGP
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-md bg-zinc-50 p-3 text-sm dark:bg-zinc-800/50">
                  {p.proofImageUrl ? (
                    <a
                      href={p.proofImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                      title="Open full-size screenshot in new tab"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.proofImageUrl}
                        alt="Transaction screenshot"
                        className="max-h-64 w-auto rounded-md border border-zinc-300 dark:border-zinc-700"
                      />
                      <span className="mt-1 block text-xs text-blue-600 hover:underline">
                        Open full size →
                      </span>
                    </a>
                  ) : p.proofRef ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs uppercase tracking-wide text-zinc-500">Reference:</span>
                      <code className="font-mono font-semibold">{p.proofRef}</code>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">No proof attached.</p>
                  )}
                  {p.proofNote && (
                    <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="font-medium">Note:</span> {p.proofNote}
                    </p>
                  )}
                  {p.promoCodeUsed && (
                    <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
                      Promo: <strong>{p.promoCodeUsed}</strong> (orig {(p.originalCents! / 100).toLocaleString()} EGP)
                    </p>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={adminApprovePaymentAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      ✓ Approve & activate plan
                    </button>
                  </form>
                  <form action={adminRejectPaymentAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      name="reason"
                      type="text"
                      maxLength={500}
                      placeholder="Reason for rejection (optional)"
                      className="w-56 rounded-md border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                    />
                    <button
                      type="submit"
                      className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:bg-zinc-900 dark:hover:bg-red-950"
                    >
                      ✕ Reject
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="mt-6 flex flex-wrap gap-2 text-sm">
        <FilterChip href="/admin/payments" active={!status && !methodFilter} label="All" />
        <FilterChip href="/admin/payments?status=PAID" active={status === "PAID"} label="Paid" />
        <FilterChip href="/admin/payments?status=PENDING" active={status === "PENDING"} label="Pending" />
        <FilterChip href="/admin/payments?status=FAILED" active={status === "FAILED"} label="Failed" />
        <span className="mx-1 text-zinc-300">|</span>
        <FilterChip href="/admin/payments?method=CARD" active={methodFilter === "CARD"} label="Card" />
        <FilterChip
          href="/admin/payments?method=VODAFONE_CASH"
          active={methodFilter === "VODAFONE_CASH"}
          label="Vodafone Cash"
        />
        <FilterChip
          href="/admin/payments?method=INSTAPAY"
          active={methodFilter === "INSTAPAY"}
          label="Instapay"
        />
      </nav>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {payments.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">No payments.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/30">
                <tr>
                  <th className="px-4 py-3 text-start">Date</th>
                  <th className="px-4 py-3 text-start">User</th>
                  <th className="px-4 py-3 text-start">Plan</th>
                  <th className="px-4 py-3 text-start">Method</th>
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
                    <td className="px-4 py-3 text-xs">
                      {p.paymentMethod === "CARD"
                        ? "💳 Card"
                        : p.paymentMethod === "VODAFONE_CASH"
                          ? "📱 Vodafone"
                          : "⚡ Instapay"}
                      {p.proofImageUrl ? (
                        <a
                          href={p.proofImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-blue-600 hover:underline"
                        >
                          View screenshot
                        </a>
                      ) : p.proofRef ? (
                        <div className="font-mono text-zinc-500">{p.proofRef}</div>
                      ) : null}
                    </td>
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
