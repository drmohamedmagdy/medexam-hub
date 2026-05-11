import { prisma } from "../src/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

async function main() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);

  const failures = await prisma.emailLog.findMany({
    where: { error: { not: null }, sentAt: { gte: weekAgo } },
    orderBy: { sentAt: "desc" },
    take: 50,
    include: { user: { select: { email: true, name: true } } },
  });

  console.log(`Email failures in the last 7 days: ${failures.length}\n`);
  for (const f of failures) {
    const when = f.sentAt.toISOString().slice(0, 16).replace("T", " ");
    const who = f.user?.name?.trim() || f.user?.email || f.userId;
    console.log(`  ${when}  ${f.category.padEnd(20)} → ${who}`);
    console.log(`    to:    ${f.toEmail}`);
    console.log(`    error: ${f.error}\n`);
  }

  // Per-category failure breakdown.
  const byCat = await prisma.emailLog.groupBy({
    by: ["category"],
    where: { error: { not: null }, sentAt: { gte: weekAgo } },
    _count: { _all: true },
  });
  if (byCat.length > 0) {
    console.log(`By category:`);
    for (const c of byCat.sort((a, b) => b._count._all - a._count._all)) {
      console.log(`  ${c.category.padEnd(20)} ${c._count._all}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
