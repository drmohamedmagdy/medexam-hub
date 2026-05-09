import "server-only";
import type { NextRequest } from "next/server";

/**
 * Per-instance sliding-window rate limiter.
 *
 * Caveat: each Vercel serverless instance has its own Map, so a
 * determined attacker can route around this by hammering enough
 * instances. For real DDoS protection swap the storage for Upstash
 * Redis or similar; the API here was designed so that swap is a
 * one-file change. For everyday spam (rage-clicks, naive bots) a
 * per-instance bucket is plenty.
 */

type Bucket = number[]; // sorted timestamps (ms)

const buckets = new Map<string, Bucket>();

// Periodic GC so an idle key doesn't keep its array around forever.
// We don't run a timer (serverless) — we sweep opportunistically every
// time the map grows past the threshold.
const GC_THRESHOLD = 5_000;

function gc(now: number, windowMs: number) {
  if (buckets.size < GC_THRESHOLD) return;
  for (const [k, ts] of buckets) {
    while (ts.length > 0 && ts[0] < now - windowMs) ts.shift();
    if (ts.length === 0) buckets.delete(k);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  /** Seconds until the bucket refills enough to allow another request. */
  retryAfterSec: number;
};

export function rateLimit(opts: {
  /** Stable identifier — e.g. `messages-post:userId:abc123`. */
  key: string;
  /** Max requests per window. */
  limit: number;
  /** Window length in ms. */
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  const cutoff = now - opts.windowMs;
  let ts = buckets.get(opts.key);
  if (!ts) {
    ts = [];
    buckets.set(opts.key, ts);
  }
  // Drop entries outside the window.
  while (ts.length > 0 && ts[0] < cutoff) ts.shift();

  if (ts.length >= opts.limit) {
    const oldest = ts[0]!;
    const retryAfterMs = Math.max(0, oldest + opts.windowMs - now);
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  ts.push(now);
  gc(now, opts.windowMs);
  return {
    ok: true,
    remaining: opts.limit - ts.length,
    retryAfterSec: 0,
  };
}

/** Best-effort client identifier for unauthenticated requests. */
export function clientIp(req: NextRequest | Request): string {
  // Vercel sets x-forwarded-for; first entry is the user.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

/** 429 response with the standard Retry-After header set. */
export function tooManyRequests(retryAfterSec: number): Response {
  return new Response(JSON.stringify({ error: "Too many requests" }), {
    status: 429,
    headers: {
      "content-type": "application/json",
      "retry-after": String(retryAfterSec),
    },
  });
}
