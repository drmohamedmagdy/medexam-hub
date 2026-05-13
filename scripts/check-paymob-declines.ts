import { prisma } from "../src/lib/db";

/**
 * Show recent FAILED PaymentOrders with their rejection reasons. Useful
 * for seeing what Paymob actually returned when a card was declined —
 * the rejectionReason field is the first 280 chars of the txn.data
 * payload Paymob sent back via webhook.
 *
 * Run: npx tsx scripts/check-paymob-declines.ts
 */
async function main() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const failed = await prisma.paymentOrder.findMany({
    where: {
      status: "FAILED",
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      user: { select: { email: true, name: true } },
    },
  });

  if (failed.length === 0) {
    console.log("No FAILED orders in the last 24 hours.");
  } else {
    console.log(`\n${failed.length} FAILED order(s) in last 24h:\n`);
    for (const o of failed) {
      console.log(`— ${o.createdAt.toISOString()}`);
      console.log(`  order:    ${o.id}`);
      console.log(`  user:     ${o.user.email} (${o.user.name ?? "no name"})`);
      console.log(`  plan:     ${o.plan} × ${o.durationMonths} mo`);
      console.log(`  amount:   ${(o.amountCents / 100).toLocaleString()} EGP`);
      console.log(`  paymobTx: ${o.paymobTxId ?? "(no txn id — declined before webhook fired)"}`);
      console.log(`  reason:   ${o.rejectionReason ?? "(none recorded)"}`);
      console.log("");
    }
  }

  // Also surface PENDING orders that are >10 min old — those are
  // suspicious (webhook didn't fire, possibly HMAC mismatch).
  const stalePending = await prisma.paymentOrder.findMany({
    where: {
      status: "PENDING",
      createdAt: { gte: since, lte: new Date(Date.now() - 10 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      createdAt: true,
      plan: true,
      amountCents: true,
      durationMonths: true,
    },
  });
  if (stalePending.length > 0) {
    console.log(`\n${stalePending.length} stale PENDING order(s) (>10 min old, webhook never confirmed):\n`);
    for (const o of stalePending) {
      console.log(
        `  ${o.createdAt.toISOString()}  ${o.id.slice(0, 12)}  ${o.plan} × ${o.durationMonths}mo  ${(o.amountCents / 100).toLocaleString()} EGP`
      );
    }
    console.log(
      `\nStale PENDINGs usually mean Paymob never POSTed our webhook — likely HMAC mismatch.`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
