#!/usr/bin/env node
// Run `prisma migrate deploy` with one automatic retry on transient
// failures. Specifically guards against P1002 — the Postgres advisory
// lock timeout that bites us when two Vercel builds run back-to-back
// and the first build's migration lock hasn't been released yet:
//
//   Error: P1002
//   The database server was reached but timed out.
//   Context: Timed out trying to acquire a postgres advisory lock
//   (SELECT pg_advisory_lock(72707369)). Timeout: 10000ms.
//
// Re-running after a short wait clears the contention every time —
// the previous build releases the lock once its own migrations finish.
// We retry twice (so total 3 attempts) before giving up.

import { spawnSync } from "node:child_process";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 15000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      console.log(
        `[migrate-deploy-with-retry] attempt ${attempt}/${MAX_ATTEMPTS} after ${RETRY_DELAY_MS}ms wait`
      );
    }
    const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
      stdio: "inherit",
      shell: true,
    });
    if (result.status === 0) process.exit(0);
    if (attempt < MAX_ATTEMPTS) {
      console.error(
        `[migrate-deploy-with-retry] exit ${result.status} — likely transient (advisory lock contention with a concurrent build). Retrying…`
      );
      await sleep(RETRY_DELAY_MS);
    }
  }
  console.error(
    `[migrate-deploy-with-retry] all ${MAX_ATTEMPTS} attempts failed. Failing the build.`
  );
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
