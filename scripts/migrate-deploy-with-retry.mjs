#!/usr/bin/env node
// Production-safe wrapper around `prisma migrate deploy`. Handles two
// failure modes observed in this project's Vercel + Neon setup:
//
// 1. ORPHANED ADVISORY LOCK
//    Neon's connection pooler keeps sessions alive between requests.
//    When a previous Vercel build's migrate-deploy session gets returned
//    to the pool while still holding pg_advisory_lock(72707369), the next
//    deploy can't acquire the lock and times out with P1002. Waiting for
//    Postgres to age out the orphan session usually takes 30–120 seconds.
//
// 2. SHORT TRANSIENT CONTENTION
//    Back-to-back commits where the previous build's migration is
//    legitimately still running. A 15-second pause clears this.
//
// Strategy:
//   - First call `prisma migrate status` (read-only, NO advisory lock).
//     If no migrations are pending, we skip `migrate deploy` entirely.
//     This handles the common case (every redeploy except actual schema
//     changes) without ever touching the lock.
//   - Only when status reports pending migrations do we run
//     `migrate deploy`, with retries and longer waits to outlast
//     orphan locks.

import { spawnSync } from "node:child_process";

const MAX_DEPLOY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 30_000; // 30 s × 4 retries = 120 s of headroom

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runPrisma(args, { capture = false } = {}) {
  return spawnSync("npx", ["prisma", ...args], {
    stdio: capture ? "pipe" : "inherit",
    shell: true,
  });
}

function hasPendingMigrations(statusOutput) {
  // `prisma migrate status` writes a recognisable phrase when migrations
  // are still to apply. Match defensively across phrasings.
  return /Following migration.* have not yet been applied|migrations have not yet been applied/i.test(
    statusOutput
  );
}

async function main() {
  console.log("[migrate-deploy-with-retry] checking migrate status…");
  const status = runPrisma(["migrate", "status"], { capture: true });
  const stdoutText = status.stdout?.toString() ?? "";
  const stderrText = status.stderr?.toString() ?? "";
  const combined = stdoutText + "\n" + stderrText;

  // Print the status output so the build log shows what we saw.
  if (combined.trim().length > 0) process.stdout.write(combined);

  // Exit 0 from `migrate status` means everything is applied AND can
  // be safely queried. Some Prisma versions also exit 0 even when
  // pending migrations exist (and just print a message), so we also
  // pattern-match on the output text.
  const pending = hasPendingMigrations(combined);

  if (!pending) {
    console.log(
      "[migrate-deploy-with-retry] no pending migrations — skipping deploy."
    );
    process.exit(0);
  }

  // Pending migrations exist. Apply with retries; orphan-lock waits can
  // be long, hence the 30s gap × 4 retries = 120s budget.
  console.log(
    `[migrate-deploy-with-retry] pending migrations detected. Will attempt deploy up to ${MAX_DEPLOY_ATTEMPTS} times.`
  );

  for (let attempt = 1; attempt <= MAX_DEPLOY_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      console.log(
        `[migrate-deploy-with-retry] attempt ${attempt}/${MAX_DEPLOY_ATTEMPTS} after ${RETRY_DELAY_MS / 1000}s wait`
      );
    }
    const result = runPrisma(["migrate", "deploy"]);
    if (result.status === 0) process.exit(0);
    if (attempt < MAX_DEPLOY_ATTEMPTS) {
      console.error(
        `[migrate-deploy-with-retry] exit ${result.status} — likely orphan advisory lock from a prior build. Retrying…`
      );
      await sleep(RETRY_DELAY_MS);
    }
  }
  console.error(
    `[migrate-deploy-with-retry] all ${MAX_DEPLOY_ATTEMPTS} attempts failed. Failing the build.`
  );
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
