import "server-only";
import { prisma } from "@/lib/db";

/**
 * Writes a runtime error to the ErrorLog table. Always swallows its own
 * failures — if logging is broken, that must not cascade.
 */
export async function logError(opts: {
  message: string;
  stack?: string | null;
  digest?: string | null;
  route?: string | null;
  userId?: string | null;
}): Promise<void> {
  try {
    await prisma.errorLog.create({
      data: {
        message: opts.message.slice(0, 2000),
        stack: opts.stack ? opts.stack.slice(0, 8000) : null,
        digest: opts.digest ?? null,
        route: opts.route ?? null,
        userId: opts.userId ?? null,
      },
    });
  } catch (e) {
    // Never raise from a logging path. Console gives Vercel logs a copy
    // of the original error in case the database is the thing that's broken.
    console.error("[logError] failed to persist error", e);
  }
}
