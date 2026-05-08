/**
 * One-off script to seed the OMAR2026 promo code.
 *
 * Run with: npx tsx --env-file=.env scripts/seed-omar2026.ts
 *
 * Idempotent: upserts by code.
 */
import { prisma } from "../src/lib/db";

async function main() {
  const code = "OMAR2026";
  const promo = await prisma.promoCode.upsert({
    where: { code },
    update: {
      discountType: "PERCENT",
      discountValue: 70,
      applicablePlans: "ALL",
      maxUsesPerUser: 1,
      isActive: true,
    },
    create: {
      code,
      discountType: "PERCENT",
      discountValue: 70,
      applicablePlans: "ALL",
      maxUses: null,
      maxUsesPerUser: 1,
      expiresAt: null,
      isActive: true,
      notes: "Launch promo — 70% off all paid plans",
    },
  });
  console.log("Seeded promo:", {
    id: promo.id,
    code: promo.code,
    discountValue: promo.discountValue,
    isActive: promo.isActive,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
