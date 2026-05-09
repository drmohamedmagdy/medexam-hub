import { prisma } from "../src/lib/db";

async function main() {
  const target = (process.argv[2] ?? "").toUpperCase().trim();

  if (!target) {
    // Original "show everything" mode.
    const totalRedemptions = await prisma.promoRedemption.count();
    const totalCodes = await prisma.promoCode.count();
    if (totalRedemptions === 0) {
      console.log(
        `No redemptions yet. ${totalCodes} promo codes exist in the DB.`
      );
      const codes = await prisma.promoCode.findMany({
        select: {
          code: true,
          isActive: true,
          maxUses: true,
          expiresAt: true,
          _count: { select: { redemptions: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      console.log("\nCodes:");
      for (const c of codes) {
        console.log(
          `  ${c.code} — active=${c.isActive}, redeemed=${c._count.redemptions}/${c.maxUses ?? "∞"}, expires=${c.expiresAt?.toISOString().slice(0, 10) ?? "never"}`
        );
      }
      return;
    }

    const recent = await prisma.promoRedemption.findMany({
      orderBy: { redeemedAt: "desc" },
      take: 50,
      include: {
        promoCode: { select: { code: true } },
        user: { select: { email: true, name: true } },
      },
    });

    console.log(`${totalRedemptions} promo redemptions total.\n`);
    console.log("Recent redemptions:");
    for (const r of recent) {
      const name = r.user.name?.trim() || r.user.email;
      const saved = r.originalCents - r.finalCents;
      console.log(
        `  ${r.redeemedAt.toISOString().slice(0, 16).replace("T", " ")}  ${r.promoCode.code.padEnd(12)} ${r.plan.padEnd(10)} ${name} — paid ${(r.finalCents / 100).toFixed(2)} (saved ${(saved / 100).toFixed(2)})`
      );
    }
    return;
  }

  // Single-code investigation mode.
  console.log(`Investigating promo code: ${target}\n`);

  const code = await prisma.promoCode.findUnique({
    where: { code: target },
    include: {
      _count: { select: { redemptions: true, paymentOrders: true } },
    },
  });

  if (!code) {
    console.log(`❌ No promo code with code="${target}" exists in the DB.`);
    // Maybe a near-match search
    const similar = await prisma.promoCode.findMany({
      where: { code: { contains: target.slice(0, 4), mode: "insensitive" } },
      select: { code: true, isActive: true },
    });
    if (similar.length > 0) {
      console.log("\nSimilar codes:");
      for (const s of similar) console.log(`  ${s.code} (active=${s.isActive})`);
    }
    return;
  }

  console.log(
    `Code: ${code.code}\n  active=${code.isActive}, discount=${code.discountValue}${code.discountType === "PERCENT" ? "%" : " cents"}, expires=${code.expiresAt?.toISOString().slice(0, 10) ?? "never"}`
  );
  console.log(
    `  redemptions: ${code._count.redemptions}, attached payment orders: ${code._count.paymentOrders}`
  );

  // All payment orders that referenced this promo, regardless of paid status.
  const orders = await prisma.paymentOrder.findMany({
    where: { promoCodeId: code.id },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { email: true, name: true } } },
  });

  console.log(`\nPayment orders using this code (${orders.length}):`);
  for (const o of orders) {
    const name = o.user.name?.trim() || o.user.email;
    console.log(
      `  ${o.createdAt.toISOString().slice(0, 16).replace("T", " ")}  ${o.status.padEnd(8)} ${o.plan.padEnd(10)} ${name}`
    );
    console.log(
      `    id=${o.id} amount=${(o.amountCents / 100).toFixed(2)} ${o.currency}`
    );
  }

  // Redemptions confirmed (i.e. payment was approved).
  const redemptions = await prisma.promoRedemption.findMany({
    where: { promoCodeId: code.id },
    orderBy: { redeemedAt: "desc" },
    include: { user: { select: { email: true, name: true } } },
  });
  console.log(`\nConfirmed redemptions (${redemptions.length}):`);
  for (const r of redemptions) {
    const name = r.user.name?.trim() || r.user.email;
    console.log(
      `  ${r.redeemedAt.toISOString().slice(0, 16).replace("T", " ")}  ${r.plan.padEnd(10)} ${name} — paid ${(r.finalCents / 100).toFixed(2)}`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
