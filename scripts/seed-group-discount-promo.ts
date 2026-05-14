import { prisma } from "../src/lib/db";

// Seed a single 30%-off group discount promo code that students can
// share within a study batch. Idempotent — re-running the script just
// resyncs the active flag and discount value (won't duplicate the row).
//
//   STUDY30  →  30% off any paid plan, 1 use per user, up to 200 total
//
// Adjust maxUses / expiresAt below before running if you want a tighter
// or wider campaign.
async function main() {
  const code = "STUDY30";
  const discountPct = 30;
  const maxUses = 200;
  const expiresAt = new Date("2026-12-31T23:59:59Z");

  const existing = await prisma.promoCode.findUnique({ where: { code } });
  if (existing) {
    await prisma.promoCode.update({
      where: { code },
      data: {
        discountType: "PERCENT",
        discountValue: discountPct,
        applicablePlans: "BASIC,PRO,PREMIUM",
        maxUses,
        maxUsesPerUser: 1,
        expiresAt,
        isActive: true,
        notes:
          "Group / study-batch discount. Ambassadors share with their year. 30% off any paid plan, monthly or annual.",
      },
    });
    console.log(`Updated existing promo ${code} → ${discountPct}% off`);
  } else {
    await prisma.promoCode.create({
      data: {
        code,
        discountType: "PERCENT",
        discountValue: discountPct,
        applicablePlans: "BASIC,PRO,PREMIUM",
        maxUses,
        maxUsesPerUser: 1,
        expiresAt,
        isActive: true,
        notes:
          "Group / study-batch discount. Ambassadors share with their year. 30% off any paid plan, monthly or annual.",
      },
    });
    console.log(`Created promo ${code} → ${discountPct}% off`);
  }

  console.log("");
  console.log("Share link:");
  console.log(`  https://medexamhub.org/plans?promo=${code}`);
  console.log("");
  console.log("Manual entry on /checkout/<plan> works too — code is exact-match.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
