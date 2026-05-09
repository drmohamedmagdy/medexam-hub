import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/error-logger";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";

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
  await logError({
    message: parsed.data.message,
    stack: parsed.data.stack ?? null,
    digest: parsed.data.digest ?? null,
    route: parsed.data.route ?? null,
    userId: me?.id ?? null,
  });
  return Response.json({ ok: true });
}
