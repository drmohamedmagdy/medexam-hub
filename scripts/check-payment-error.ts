import { prisma } from "../src/lib/db";

async function main() {
  // The "Reference: 3717353293" from the user's screenshot is Next's
  // digest. ErrorLogs created in the last 30 minutes are likely from
  // the failed return-page render.
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const errors = await prisma.errorLog.findMany({
    where: { createdAt: { gte: cutoff } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (errors.length === 0) {
    console.log("No recent errors logged.");
    return;
  }

  for (const e of errors) {
    console.log(`\n— ${e.createdAt.toISOString()}`);
    console.log(`  route: ${e.route ?? "(none)"}`);
    console.log(`  digest: ${e.digest ?? "(none)"}`);
    console.log(`  message: ${e.message}`);
    if (e.stack) {
      console.log(`  stack (first 6 lines):`);
      console.log(e.stack.split("\n").slice(0, 6).map((l) => `    ${l}`).join("\n"));
    }
  }

  // Also check the most recent PaymentOrder to see whether the webhook
  // actually marked it paid.
  const latestOrders = await prisma.paymentOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      userId: true,
      plan: true,
      status: true,
      amountCents: true,
      paymobOrderId: true,
      paymobTxId: true,
      paidAt: true,
      createdAt: true,
    },
  });
  console.log(`\nLatest payment orders:`);
  for (const o of latestOrders) {
    console.log(
      `  ${o.createdAt.toISOString()}  ${o.id.slice(0, 10)}  ${o.plan}  ${o.status}  paymobTx=${o.paymobTxId ?? "—"}  paid=${o.paidAt?.toISOString() ?? "—"}`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
