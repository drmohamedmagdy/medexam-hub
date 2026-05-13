import { prisma } from "../src/lib/db";

async function main() {
  const o = await prisma.paymentOrder.findFirst({
    where: { status: "PAID" },
    orderBy: { paidAt: "desc" },
    select: { id: true, plan: true, amountCents: true, paidAt: true },
  });
  if (!o) {
    console.log("No PAID orders found.");
    return;
  }
  console.log("Latest PAID order:");
  console.log("  ID:    " + o.id);
  console.log("  URL:   https://medexamhub.org/account/orders/" + o.id + "/invoice");
  console.log("  Plan:  " + o.plan + " — " + (o.amountCents / 100) + " EGP");
  console.log("  Paid:  " + (o.paidAt?.toISOString() ?? "(no paidAt)"));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
