import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Server-Sent Events stream for a 1:1 thread.
 *
 * Replaces the 3-second client-side polling with a single long-lived
 * connection that internally polls the DB every couple seconds and
 * pushes new messages as `data:` events. EventSource on the browser
 * auto-reconnects on close; we use the `id:` field with the latest
 * sentAt so the next connection's `Last-Event-ID` header tells us
 * where to resume — no message gets dropped or replayed across
 * reconnects.
 *
 * Connection lifetime is capped at 25 seconds so we play nicely with
 * Vercel function timeouts; the client just reconnects.
 */

// Force the Node runtime so prisma works.
export const runtime = "nodejs";

const MAX_DURATION_MS = 25_000;
const POLL_INTERVAL_MS = 2_000;
const HEARTBEAT_BEFORE_FIRST_POLL_MS = 250;

function pickSinceFromHeaders(req: NextRequest, fallback: string | null): Date {
  // EventSource sends the last `id:` we emitted as Last-Event-ID on
  // reconnect — that takes priority over the initial ?since= param.
  const lastEvent = req.headers.get("last-event-id");
  const raw = lastEvent ?? fallback ?? "";
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const me = await getCurrentUser();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const { userId: partnerId } = await params;
  if (partnerId === me.id) return new Response("Forbidden", { status: 403 });

  const sinceParam = req.nextUrl.searchParams.get("since");
  let watermark = pickSinceFromHeaders(req, sinceParam);

  const encoder = new TextEncoder();
  const meId = me.id;

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const closeOnce = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      // If the client disconnects mid-stream, abort our poll loop.
      req.signal.addEventListener("abort", closeOnce);

      function send(line: string) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(line));
        } catch {
          closeOnce();
        }
      }

      // First byte: a comment-line "ping" forces some proxies to
      // commit to the streaming response immediately.
      send(`: connected\n\n`);

      const startedAt = Date.now();
      await new Promise((r) => setTimeout(r, HEARTBEAT_BEFORE_FIRST_POLL_MS));

      while (!closed && Date.now() - startedAt < MAX_DURATION_MS) {
        try {
          const messages = await prisma.message.findMany({
            where: {
              sentAt: { gt: watermark },
              OR: [
                { senderId: meId, receiverId: partnerId },
                { senderId: partnerId, receiverId: meId },
              ],
            },
            orderBy: { sentAt: "asc" },
            take: 50,
            select: {
              id: true,
              senderId: true,
              receiverId: true,
              body: true,
              sentAt: true,
            },
          });

          if (messages.length > 0) {
            for (const m of messages) {
              const payload = JSON.stringify({
                id: m.id,
                senderId: m.senderId,
                receiverId: m.receiverId,
                body: m.body,
                sentAt: m.sentAt.toISOString(),
              });
              // `id:` lets EventSource replay from this point on
              // reconnect via Last-Event-ID.
              send(`id: ${m.sentAt.toISOString()}\n`);
              send(`event: message\n`);
              send(`data: ${payload}\n\n`);
              if (m.sentAt > watermark) watermark = m.sentAt;
            }
            // Best-effort: mark inbound from the partner as read.
            // Fire-and-forget so a slow update doesn't stall the loop.
            void prisma.message
              .updateMany({
                where: {
                  senderId: partnerId,
                  receiverId: meId,
                  readAt: null,
                },
                data: { readAt: new Date() },
              })
              .catch(() => {});
          } else {
            // Heartbeat keeps proxies and load balancers from killing
            // the connection during quiet periods.
            send(`: hb\n\n`);
          }
        } catch (e) {
          // Don't propagate DB errors as a stream error event — let
          // the client just reconnect.
          send(`: err\n\n`);
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }

      closeOnce();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "connection": "keep-alive",
      // Disable nginx-style buffering so events flush immediately.
      "x-accel-buffering": "no",
    },
  });
}
