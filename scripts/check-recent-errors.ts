import { prisma } from "../src/lib/db";

async function main() {
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const errors = await prisma.errorLog.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { createdAt: true, route: true, message: true, digest: true, stack: true },
  });
  if (errors.length === 0) {
    console.log("No errors in the last 2 hours.");
    return;
  }
  console.log(`${errors.length} error(s) in last 2h:\n`);
  for (const e of errors) {
    console.log("—", e.createdAt.toISOString());
    console.log("  route:  ", e.route ?? "(none)");
    console.log("  digest: ", e.digest ?? "(none)");
    console.log("  msg:    ", e.message?.slice(0, 300));
    if (e.stack) console.log("  stack:  ", e.stack.split("\n").slice(0, 5).join("\n           "));
    console.log("");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
