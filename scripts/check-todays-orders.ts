import { prisma } from "../src/lib/db";

async function main() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const orders = await prisma.paymentOrder.findMany({
    where: { createdAt: { gte: startOfToday } },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true, name: true } },
      promoCode: { select: { code: true } },
    },
  });

  console.log(`Payment orders created today (${orders.length}):\n`);
  for (const o of orders) {
    const name = o.user.name?.trim() || o.user.email;
    console.log(
      `  ${o.createdAt.toISOString().slice(0, 16).replace("T", " ")}  ${o.status.padEnd(8)} ${o.plan.padEnd(10)} ${name}`
    );
    console.log(
      `    id=${o.id} amount=${(o.amountCents / 100).toFixed(2)} promo=${o.promoCode?.code ?? "none"}`
    );
  }

  // Also: find any user with 'khaled' in name/email
  console.log(`\nUsers matching "khaled":`);
  const khaledUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: "khaled", mode: "insensitive" } },
        { name: { contains: "khaled", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      createdAt: true,
      _count: { select: { payments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  for (const u of khaledUsers) {
    console.log(
      `  ${u.email}  name=${u.name ?? "—"}  plan=${u.plan}  joined=${u.createdAt.toISOString().slice(0, 10)}  orders=${u._count.payments}`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
