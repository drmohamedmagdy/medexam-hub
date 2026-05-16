import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/error-logger";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";

const TRANSIENT_NETWORK_RE =
  /failed to fetch|load failed|networkerror|connection appears to be offline|network request failed/i;

// Server actions are re-keyed on every deploy. Tabs that were open across
// a deploy throw this exact message on submit; client-side error.tsx
// auto-reloads, but defence-in-depth: drop it server-side too so it
// doesn't fill /admin/errors after every release.
const STALE_ACTION_RE =
  /server action .* was not found on the server|failed to find server action/i;

// Same root cause: chunk filenames change per build, so a tab open
// across a deploy 404s on lazy-loaded chunks ("Failed to load chunk N"
// / "ChunkLoadError"). error.tsx auto-reloads; we also drop here.
const CHUNK_LOAD_RE =
  /failed to load chunk|chunkloaderror|loading chunk \d+ failed/i;

// Vercel edge rejects oversize Server Action POSTs with no body — Next
// surfaces it as this exact phrase. User-recoverable (smaller file);
// not a server bug to investigate.
const ACTION_BODY_RE = /an unexpected response was received from the server/i;

const Schema = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(8000).optional(),
  digest: z.string().max(200).optional(),
  route: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  // 30 errors per minute per user-or-IP. A genuine crash loop will
  // exceed this and that's fine — we only need one log entry to
  // diagnose. A bot hammering the endpoint with garbage gets cut off.
  const id = me?.id ?? clientIp(req);
  const rl = rateLimit({
    key: `errors-log:${id}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false }, { status: 400 });
  }
  // Defence-in-depth: even if a client somehow bypasses error.tsx's
  // filter (older deploy, custom client, etc.) we drop these here.
  // They're user-environment blips, not anything we can act on.
  if (TRANSIENT_NETWORK_RE.test(parsed.data.message)) {
    return Response.json({ ok: true, skipped: "transient" });
  }
  if (STALE_ACTION_RE.test(parsed.data.message)) {
    return Response.json({ ok: true, skipped: "stale-action" });
  }
  if (CHUNK_LOAD_RE.test(parsed.data.message)) {
    return Response.json({ ok: true, skipped: "chunk-load" });
  }
  if (ACTION_BODY_RE.test(parsed.data.message)) {
    return Response.json({ ok: true, skipped: "action-body" });
  }
  await logError({
    message: parsed.data.message,
    stack: parsed.data.stack ?? null,
    digest: parsed.data.digest ?? null,
    route: parsed.data.route ?? null,
    userId: me?.id ?? null,
  });
  return Response.json({ ok: true });
}
