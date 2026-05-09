import type { Instrumentation } from "next";

/**
 * Server-side error hook. Fires when the Next.js server catches an
 * error during a render, route handler, server action, or proxy. The
 * client-side error.tsx covers the browser side; together we get a
 * full picture of what's breaking in prod.
 *
 * Dynamic-imports the logger so this file stays runtime-agnostic.
 * Prisma only works in the Node.js runtime; we skip silently on edge.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { logError } = await import("@/lib/error-logger");
    const e = err as Error & { digest?: string };
    await logError({
      message: e.message || `Server error (${context.routeType})`,
      stack: e.stack ?? null,
      digest: e.digest ?? null,
      route: request.path ?? null,
    });
  } catch (e) {
    // Never escalate from the logging path.
    console.error("[instrumentation.onRequestError] log failed", e);
  }
};
