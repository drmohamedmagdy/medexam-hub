"use client";

import { useEffect } from "react";
import Link from "next/link";

// Browser-specific network-error messages. These mean the user's
// connection blipped — they're not bugs in our code, they're not
// actionable for us, and they shouldn't fill up /admin/errors.
//   - Chrome / Edge / Firefox: "Failed to fetch"
//   - Safari / WebKit: "Load failed"
//   - Older Firefox: "NetworkError when attempting to fetch resource."
//   - Edge / IE: "The Internet connection appears to be offline."
const TRANSIENT_NETWORK_RE =
  /failed to fetch|load failed|networkerror|connection appears to be offline|network request failed/i;

function isTransientNetworkError(message: string | undefined | null): boolean {
  if (!message) return false;
  return TRANSIENT_NETWORK_RE.test(message);
}

// Next.js 16: when a new build is deployed, the IDs Next assigns to server
// actions change. Any tab that was open before the deploy still references
// the old IDs, so submitting (e.g. the promo apply or pay button) throws
// "Server Action … was not found on the server." A hard reload pulls the
// new build and resolves it.
const STALE_ACTION_RE = /server action .* was not found on the server|failed to find server action/i;

function isStaleServerAction(message: string | undefined | null): boolean {
  if (!message) return false;
  return STALE_ACTION_RE.test(message);
}

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
  const transient = isTransientNetworkError(error.message);
  const stale = isStaleServerAction(error.message);

  useEffect(() => {
    // Stale server action = user had a tab open across a deploy. Force
    // a full reload to pull the new build's action IDs. Don't log it
    // either — it's expected behaviour every time we deploy.
    if (stale) {
      // eslint-disable-next-line no-console
      console.warn("[RouteError] stale server action — auto-reloading");
      if (typeof window !== "undefined") {
        window.location.reload();
      }
      return;
    }
    // Skip the persistent log for transient network errors — they're
    // user-environment blips, not server-side issues we can act on.
    if (transient) {
      // eslint-disable-next-line no-console
      console.warn("[RouteError] transient network error, not logging:", error.message);
      return;
    }
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
  }, [error, transient, stale]);

  if (stale) {
    // Brief placeholder while the auto-reload from the effect kicks in.
    // If something blocks the reload (e.g. a misbehaving extension), the
    // button below is the manual fallback.
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:py-24">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blue-100 text-2xl text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          🔄
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">
          Page was updated
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Refreshing to pick up the latest version…
        </p>
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
            className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Refresh now
          </button>
        </div>
      </div>
    );
  }

  if (transient) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:py-24">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-2xl text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          📶
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">
          Connection problem
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          We couldn&apos;t reach the server. Check your internet connection
          and try again.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Retry
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
