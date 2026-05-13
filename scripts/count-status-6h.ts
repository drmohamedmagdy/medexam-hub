import { prisma } from "../src/lib/db";

async function main() {
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const orders = await prisma.paymentOrder.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      status: true,
      plan: true,
      durationMonths: true,
      amountCents: true,
      paymentMethod: true,
      paymobTxId: true,
    },
  });
  const counts = orders.reduce<Record<string, number>>(
    (acc, o) => ({ ...acc, [o.status]: (acc[o.status] ?? 0) + 1 }),
    {}
  );
  console.log("Last 6h:", counts);
  console.log("");
  console.log("PAID orders:");
  for (const o of orders.filter((x) => x.status === "PAID")) {
    console.log(
      `  ${o.createdAt.toISOString()}  ${o.plan}${o.durationMonths > 1 ? ` x${o.durationMonths}mo` : ""}  ${(o.amountCents / 100).toLocaleString()} EGP  ${o.paymentMethod}  tx=${o.paymobTxId}`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
