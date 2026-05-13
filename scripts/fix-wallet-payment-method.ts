import { prisma } from "../src/lib/db";

// Targeted backfill for two specific orders:
//   1. cmp1szjf0000004jupmfbf2et — May 11 TEST PRO 750 EGP — actually CARD.
//      We accidentally flipped it to VODAFONE_CASH earlier; revert it.
//   2. The May 13 BASIC 299 EGP order at ~08:02 UTC — actually WALLET.
//      Flip it from the default CARD to VODAFONE_CASH.
async function main() {
  // Revert the wrongly-flipped one.
  await prisma.paymentOrder.update({
    where: { id: "cmp1szjf0000004jupmfbf2et" },
    data: { paymentMethod: "CARD" },
  });
  console.log("Reverted cmp1szjf0000004jupmfbf2et → CARD (May 11 test, was actually card)");

  // Find the May 13 BASIC 299 EGP wallet payment by amount + plan + date.
  const may13Start = new Date("2026-05-13T07:00:00.000Z");
  const may13End = new Date("2026-05-13T10:00:00.000Z");
  const target = await prisma.paymentOrder.findFirst({
    where: {
      status: "PAID",
      plan: "BASIC",
      amountCents: 29900,
      paidAt: { gte: may13Start, lte: may13End },
      paymentMethod: "CARD",
    },
    orderBy: { paidAt: "asc" },
    select: { id: true, paidAt: true, user: { select: { email: true } } },
  });
  if (!target) {
    console.log("No matching May 13 wallet order found (already fixed?).");
    return;
  }
  await prisma.paymentOrder.update({
    where: { id: target.id },
    data: { paymentMethod: "VODAFONE_CASH" },
  });
  console.log(`Flipped ${target.id} → VODAFONE_CASH (May 13 wallet, user ${target.user.email})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
