"use client";

import { useEffect } from "react";
import Link from "next/link";

// Route-segment error boundary. Wraps every page that lives under the
// root layout so a thrown error renders this fallback instead of a
// blank "page couldn't load" surface. The button calls unstable_retry
// (Next.js 16 — formerly `reset`) to re-render the segment.
export default function RouteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Fire-and-forget log to the server. We keep this in a useEffect so
    // it runs once per mount, after hydration.
    const route =
      typeof window !== "undefined" ? window.location.pathname : null;
    fetch("/api/errors/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: error.message || "Unknown error",
        stack: error.stack,
        digest: error.digest,
        route,
      }),
      keepalive: true,
    }).catch(() => {
      // Logging is best-effort — never escalate.
    });
    // eslint-disable-next-line no-console
    console.error("[RouteError]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:py-24">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-100 text-2xl text-red-600 dark:bg-red-950/40 dark:text-red-400">
        ⚠️
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        We hit an unexpected error rendering this page. Our team has been
        notified.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[11px] text-zinc-400">
          Reference: {error.digest}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
