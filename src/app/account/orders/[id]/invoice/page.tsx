import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import PrintButton from "./PrintButton";

// Print-friendly invoice. Users open this URL, click Print → Save as PDF
// in any browser, and get a clean A4 invoice. No server-side PDF library
// required, and styles render identically in browser preview.

function methodLabel(m: string): string {
  if (m === "CARD") return "Card (Visa / Mastercard)";
  if (m === "VODAFONE_CASH") return "Mobile wallet (Vodafone Cash / Etisalat / Orange)";
  if (m === "INSTAPAY") return "Instapay";
  return m;
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [user, { id }] = await Promise.all([requireUser(), params]);

  const order = await prisma.paymentOrder.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  });

  // Only the owner can view their invoice (admins access via /admin).
  if (!order || order.userId !== user.id) return notFound();

  // Only PAID orders get invoices — pending/failed shouldn't render.
  if (order.status !== "PAID") return notFound();

  const planLabel = order.topupKind
    ? `Top-up: ${order.topupKind.replace(/_/g, " ").toLowerCase()}`
    : `${PLAN_LIMITS[order.plan].label} plan`;

  const months = order.durationMonths || 1;
  const periodLabel = order.topupKind
    ? "One-time"
    : months === 1
      ? "1 month"
      : months === 12
        ? "12 months (annual)"
        : `${months} months`;

  const amountEgp = order.amountCents / 100;
  const paidAt = order.paidAt ?? order.createdAt;
  // Invoice number derived from the order's cuid — stable, unique,
  // human-readable. Format: INV-{YYYY}-{first 8 chars of cuid, upper}.
  const invoiceNumber = `INV-${paidAt.getFullYear()}-${order.id.slice(0, 8).toUpperCase()}`;

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <>
      {/* Print CSS: hide chrome, full-width content, A4-ish margins. */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .invoice-card {
            box-shadow: none !important;
            border: none !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page { margin: 16mm; }
        }
      `}</style>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/account/subscription"
            className="text-sm text-zinc-500 hover:text-blue-600"
          >
            &larr; Back to subscription
          </Link>
          <PrintButton />
        </div>

        <div className="invoice-card rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-12">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-zinc-200 pb-6 dark:border-zinc-800">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                MedExam Hub
              </h1>
              <p className="mt-1 text-xs text-zinc-500">
                AI-powered medical exam preparation
              </p>
              <p className="mt-3 text-xs text-zinc-500">
                Cairo, Egypt
                <br />
                <a href="mailto:info@medexamhub.org" className="text-blue-600 hover:underline">
                  info@medexamhub.org
                </a>
                <br />
                medexamhub.org
              </p>
            </div>
            <div className="text-end">
              <h2 className="text-xl font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Invoice
              </h2>
              <p className="mt-2 text-xs text-zinc-500">Invoice number</p>
              <p className="font-mono text-sm font-semibold">{invoiceNumber}</p>
              <p className="mt-3 text-xs text-zinc-500">Issued</p>
              <p className="text-sm">{fmtDate(paidAt)}</p>
            </div>
          </div>

          {/* Billed to */}
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Billed to
              </p>
              <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {order.user.name || order.user.email.split("@")[0]}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {order.user.email}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Payment
              </p>
              <p className="mt-2 text-sm">{methodLabel(order.paymentMethod)}</p>
              <p className="text-xs text-zinc-500">Status: Paid</p>
              {order.paymobTxId && (
                <p className="mt-1 font-mono text-[11px] text-zinc-400">
                  Txn: {order.paymobTxId}
                </p>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="mt-8">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-300 dark:border-zinc-700">
                  <th className="py-2 text-start text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Description
                  </th>
                  <th className="py-2 text-end text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Period
                  </th>
                  <th className="py-2 text-end text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-3">
                    <span className="font-medium">{planLabel}</span>
                    <br />
                    <span className="text-xs text-zinc-500">
                      Digital subscription — AI exam generation, library
                      access, exam history.
                    </span>
                  </td>
                  <td className="py-3 text-end text-xs text-zinc-600 dark:text-zinc-400">
                    {periodLabel}
                  </td>
                  <td className="py-3 text-end font-mono">
                    {amountEgp.toLocaleString()} EGP
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="pt-4 text-end text-xs text-zinc-500">
                    Subtotal
                  </td>
                  <td className="pt-4 text-end font-mono text-sm">
                    {amountEgp.toLocaleString()} EGP
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="text-end text-xs text-zinc-500">
                    VAT
                  </td>
                  <td className="text-end font-mono text-xs text-zinc-500">
                    Included
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={2}
                    className="border-t border-zinc-300 pt-3 text-end text-sm font-semibold dark:border-zinc-700"
                  >
                    Total paid
                  </td>
                  <td className="border-t border-zinc-300 pt-3 text-end font-mono text-lg font-bold dark:border-zinc-700">
                    {amountEgp.toLocaleString()} EGP
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-12 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800">
            <p>
              This is your receipt and tax invoice for the purchase above.
              Keep it for your records. For refund requests, see our{" "}
              <Link
                href="/refund"
                className="text-blue-600 hover:underline"
              >
                refund policy
              </Link>
              .
            </p>
            <p className="mt-2">
              Order ID:{" "}
              <span className="font-mono text-[11px]">{order.id}</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
