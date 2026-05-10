import { prisma } from "../src/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

async function main() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - DAY_MS);
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);

  const [total, last24h, last7d, recent, topDigests] = await Promise.all([
    prisma.errorLog.count(),
    prisma.errorLog.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.errorLog.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.errorLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        message: true,
        route: true,
        digest: true,
        createdAt: true,
        userId: true,
      },
    }),
    prisma.errorLog.groupBy({
      by: ["digest"],
      where: { createdAt: { gte: weekAgo }, digest: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { digest: "desc" } },
      take: 5,
    }),
  ]);

  console.log(`Error log totals:`);
  console.log(`  All time:    ${total}`);
  console.log(`  Last 24h:    ${last24h}`);
  console.log(`  Last 7 days: ${last7d}\n`);

  if (topDigests.length > 0) {
    console.log(`Top recurring digests (last 7d):`);
    for (const d of topDigests) {
      console.log(`  ${d.digest}  × ${d._count._all}`);
    }
    console.log();
  }

  if (recent.length === 0) {
    console.log("No errors logged.");
    return;
  }

  console.log(`Most recent ${recent.length}:`);
  for (const e of recent) {
    const when = e.createdAt.toISOString().slice(0, 16).replace("T", " ");
    const route = e.route ?? "-";
    const digest = e.digest ? ` digest=${e.digest.slice(0, 8)}` : "";
    const userBit = e.userId ? ` user=${e.userId.slice(0, 8)}` : "";
    console.log(`  ${when}  ${route.padEnd(20)} ${e.message.slice(0, 80)}${digest}${userBit}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
