import { prisma } from "../src/lib/db";

async function main() {
  const orders = await prisma.paymentOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      user: { select: { email: true } },
    },
  });

  for (const o of orders) {
    const ageMin = Math.round(
      (Date.now() - o.createdAt.getTime()) / 60000
    );
    console.log(
      `${o.createdAt.toISOString()}  ${o.id.slice(0, 12)}  ${o.status.padEnd(7)}  ${o.plan} × ${o.durationMonths}mo  ${(o.amountCents / 100).toLocaleString()} EGP  pay=${o.paymentMethod}  age=${ageMin}m  user=${o.user.email}`
    );
    if (o.paymobTxId) console.log(`   paymobTx=${o.paymobTxId}  paidAt=${o.paidAt?.toISOString() ?? "—"}`);
    if (o.rejectionReason) console.log(`   reject=${o.rejectionReason.slice(0, 120)}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
