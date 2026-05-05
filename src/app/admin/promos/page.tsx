import Link from "next/link";
import { prisma } from "@/lib/db";
import { describePromoDiscount, parseApplicablePlans } from "@/lib/promo";
import { adminTogglePromoAction } from "@/app/actions/promo";

export const metadata = { title: "Admin — Promo codes" };

export default async function AdminPromosPage() {
  const now = new Date();

  const [promos, totalPromos, activePromos, redemptionAgg] = await Promise.all([
    prisma.promoCode.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { redemptions: true } },
      },
    }),
    prisma.promoCode.count(),
    prisma.promoCode.count({ where: { isActive: true } }),
    prisma.promoRedemption.aggregate({
      _sum: { originalCents: true, finalCents: true },
      _count: true,
    }),
  ]);

  const totalRedemptions = redemptionAgg._count;
  const totalDiscountedEgp =
    ((redemptionAgg._sum.originalCents ?? 0) - (redemptionAgg._sum.finalCents ?? 0)) / 100;
  const totalRevenueEgp = (redemptionAgg._sum.finalCents ?? 0) / 100;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Promo codes</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Create, manage, and track discount codes.
          </p>
        </div>
        <Link
          href="/admin/promos/new"
          className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 sm:w-auto"
        >
          + New promo code
        </Link>
      </div>

      <section className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-4">
        <Stat label="Total codes" value={totalPromos.toLocaleString()} hint={`${activePromos} active`} />
        <Stat label="Total redemptions" value={totalRedemptions.toLocaleString()} hint="across all codes" />
        <Stat
          label="Discounts given"
          value={`${totalDiscountedEgp.toLocaleString()} EGP`}
          hint="total customer savings"
        />
        <Stat
          label="Revenue from promos"
          value={`${totalRevenueEgp.toLocaleString()} EGP`}
          hint="net of discount"
        />
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {promos.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500">
            No promo codes yet.{" "}
            <Link href="/admin/promos/new" className="text-blue-600 hover:underline">
              Create your first one
            </Link>
            .
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[60rem] text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/30">
                <tr>
                  <th className="px-4 py-3 text-start">Code</th>
                  <th className="px-4 py-3 text-start">Discount</th>
                  <th className="px-4 py-3 text-start">Plans</th>
                  <th className="px-4 py-3 text-start">Expires</th>
                  <th className="px-4 py-3 text-end">Used</th>
                  <th className="px-4 py-3 text-end">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {promos.map((p) => {
                  const plans = parseApplicablePlans(p.applicablePlans);
                  const isExpired = !!p.expiresAt && p.expiresAt < now;
                  const usedDisplay = p.maxUses
                    ? `${p._count.redemptions} / ${p.maxUses}`
                    : `${p._count.redemptions}`;
                  const status = !p.isActive
                    ? { label: "Disabled", style: "bg-zinc-100 text-zinc-700" }
                    : isExpired
                      ? { label: "Expired", style: "bg-red-100 text-red-700" }
                      : { label: "Active", style: "bg-emerald-100 text-emerald-800" };
                  return (
                    <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-mono font-semibold">
                        <Link href={`/admin/promos/${p.id}`} className="hover:text-blue-600">
                          {p.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{describePromoDiscount(p)}</td>
                      <td className="px-4 py-3 text-xs">
                        {p.applicablePlans === "ALL" || plans.length === 3
                          ? "All paid"
                          : plans.join(", ")}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {p.expiresAt ? p.expiresAt.toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-4 py-3 text-end font-mono">{usedDisplay}</td>
                      <td className="px-4 py-3 text-end">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.style}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end">
                        <div className="flex justify-end gap-2">
                          <form action={adminTogglePromoAction}>
                            <input type="hidden" name="id" value={p.id} />
                            <button
                              type="submit"
                              className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                            >
                              {p.isActive ? "Disable" : "Enable"}
                            </button>
                          </form>
                          <Link
                            href={`/admin/promos/${p.id}`}
                            className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                          >
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs">{label}</div>
      <div className="mt-2 text-xl font-semibold sm:text-2xl">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{hint}</div>
    </div>
  );
}
