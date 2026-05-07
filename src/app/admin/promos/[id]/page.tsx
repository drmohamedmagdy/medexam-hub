import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { parseApplicablePlans, parsePaymobLinks } from "@/lib/promo";
import { adminDeletePromoAction } from "@/app/actions/promo";
import PromoForm from "../PromoForm";

export const metadata = { title: "Admin — Edit promo code" };

export default async function EditPromoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [promo, redemptions, agg] = await Promise.all([
    prisma.promoCode.findUnique({ where: { id } }),
    prisma.promoRedemption.findMany({
      where: { promoCodeId: id },
      orderBy: { redeemedAt: "desc" },
      take: 50,
      include: {
        user: { select: { email: true, name: true } },
        paymentOrder: { select: { status: true } },
      },
    }),
    prisma.promoRedemption.aggregate({
      where: { promoCodeId: id },
      _sum: { originalCents: true, finalCents: true },
      _count: true,
    }),
  ]);

  if (!promo) notFound();

  // Promo applicability UI currently supports BASIC/PRO/PREMIUM only.
  // Researcher promos can be wired up here once the admin form exposes that
  // checkbox + Paymob link slot.
  const plans = parseApplicablePlans(promo.applicablePlans).filter(
    (p): p is "BASIC" | "PRO" | "PREMIUM" => p !== "RESEARCHER"
  );
  const allSelected = promo.applicablePlans === "ALL" || plans.length === 3;
  const links = parsePaymobLinks(promo.paymobLinks);
  const expiresAtIso = promo.expiresAt
    ? promo.expiresAt.toISOString().slice(0, 10)
    : null;

  const totalRedemptions = agg._count;
  const distinctUsers = await prisma.promoRedemption.findMany({
    where: { promoCodeId: id },
    distinct: ["userId"],
    select: { userId: true },
  });
  const totalDiscountedEgp =
    ((agg._sum.originalCents ?? 0) - (agg._sum.finalCents ?? 0)) / 100;
  const totalRevenueEgp = (agg._sum.finalCents ?? 0) / 100;

  return (
    <div>
      <Link href="/admin/promos" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; Back to promo codes
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight">{promo.code}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Created {promo.createdAt.toLocaleString()}
            {promo.notes && ` · ${promo.notes}`}
          </p>
        </div>
        <form action={adminDeletePromoAction}>
          <input type="hidden" name="id" value={promo.id} />
          <button
            type="submit"
            className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Delete promo
          </button>
        </form>
      </div>

      {/* Analytics for this promo */}
      <section className="mt-5 grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <Stat label="Redemptions" value={totalRedemptions.toLocaleString()} hint={`${distinctUsers.length} unique users`} />
        <Stat
          label="Discount given"
          value={`${totalDiscountedEgp.toLocaleString()} EGP`}
          hint="customer savings"
        />
        <Stat
          label="Revenue"
          value={`${totalRevenueEgp.toLocaleString()} EGP`}
          hint="net of discount"
        />
        <Stat
          label="Status"
          value={promo.isActive ? "Active" : "Disabled"}
          hint={
            promo.expiresAt && promo.expiresAt < new Date()
              ? "Expired"
              : promo.expiresAt
                ? `Expires ${promo.expiresAt.toLocaleDateString()}`
                : "No expiry"
          }
        />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Settings</h2>
        <PromoForm
          mode="edit"
          defaults={{
            id: promo.id,
            code: promo.code,
            discountType: promo.discountType,
            discountValue: promo.discountValue,
            applicablePlans: allSelected ? [] : plans,
            maxUses: promo.maxUses,
            maxUsesPerUser: promo.maxUsesPerUser,
            expiresAt: expiresAtIso,
            isActive: promo.isActive,
            paymobLinkBasic: links.BASIC ?? "",
            paymobLinkPro: links.PRO ?? "",
            paymobLinkPremium: links.PREMIUM ?? "",
            notes: promo.notes ?? "",
          }}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Recent redemptions</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {redemptions.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              No redemptions yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/30">
                  <tr>
                    <th className="px-4 py-3 text-start">When</th>
                    <th className="px-4 py-3 text-start">User</th>
                    <th className="px-4 py-3 text-start">Plan</th>
                    <th className="px-4 py-3 text-end">Original</th>
                    <th className="px-4 py-3 text-end">Paid</th>
                    <th className="px-4 py-3 text-end">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {redemptions.map((r) => {
                    const status = r.paymentOrder?.status ?? "PENDING";
                    const style =
                      status === "PAID"
                        ? "bg-emerald-100 text-emerald-800"
                        : status === "FAILED"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800";
                    return (
                      <tr key={r.id}>
                        <td className="px-4 py-3 text-xs">{r.redeemedAt.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/users/${r.userId}`}
                            className="font-medium hover:text-blue-600"
                          >
                            {r.user.name ?? r.user.email}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{r.plan}</td>
                        <td className="px-4 py-3 text-end font-mono">
                          {(r.originalCents / 100).toLocaleString()} EGP
                        </td>
                        <td className="px-4 py-3 text-end font-mono">
                          {(r.finalCents / 100).toLocaleString()} EGP
                        </td>
                        <td className="px-4 py-3 text-end">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${style}`}
                          >
                            {status.toLowerCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs">{label}</div>
      <div className="mt-2 text-xl font-semibold sm:text-2xl">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{hint}</div>
    </div>
  );
}
