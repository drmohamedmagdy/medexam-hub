"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  enableShareAction,
  type ShareState,
} from "@/app/actions/exam-share";

function formatExpiryForInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // <input type="date"> wants YYYY-MM-DD in the local timezone.
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function ShareExamCard({
  examId,
  initialToken,
  initialUrl,
  attemptCount,
  initialExpiresAt,
  initialMaxTakers,
  initialTimeLimitSec,
}: {
  examId: string;
  initialToken: string | null;
  initialUrl: string | null;
  attemptCount: number;
  initialExpiresAt: Date | string | null;
  initialMaxTakers: number | null;
  initialTimeLimitSec: number | null;
}) {
  const initialIso =
    typeof initialExpiresAt === "string"
      ? initialExpiresAt
      : initialExpiresAt
        ? initialExpiresAt.toISOString()
        : null;

  const [token, setToken] = useState(initialToken);
  const [url, setUrl] = useState(initialUrl);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(!initialToken);
  const [expiresAt, setExpiresAt] = useState(formatExpiryForInput(initialIso));
  const [maxTakers, setMaxTakers] = useState(
    initialMaxTakers ? String(initialMaxTakers) : ""
  );
  const [timeLimit, setTimeLimit] = useState(
    initialTimeLimitSec ? String(Math.round(initialTimeLimitSec / 60)) : ""
  );

  const [state, action, pending] = useActionState<ShareState, FormData>(
    enableShareAction,
    null
  );

  useEffect(() => {
    if (state?.ok) {
      setToken(state.token);
      setUrl(state.url);
      setShowSettings(false);
    }
  }, [state]);

  const error = state && !state.ok ? state.error : null;

  async function onCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Browser may have blocked clipboard — manual selection still works.
    }
  }

  // Build a friendly summary of active gates so the creator can see at
  // a glance what limits are in force.
  const activeGates: string[] = [];
  if (initialIso) {
    const d = new Date(initialIso);
    if (!Number.isNaN(d.getTime())) {
      activeGates.push(`Expires ${d.toLocaleDateString()}`);
    }
  }
  if (initialMaxTakers && initialMaxTakers > 0) {
    activeGates.push(`Max ${initialMaxTakers} candidate${initialMaxTakers === 1 ? "" : "s"} (${attemptCount} taken)`);
  }
  if (initialTimeLimitSec && initialTimeLimitSec > 0) {
    activeGates.push(`${Math.round(initialTimeLimitSec / 60)} min time limit`);
  }

  return (
    <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-cyan-800/60 dark:bg-cyan-950/30 print:hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-blue-900 dark:text-cyan-200">
            🔗 Share this exam
          </h2>
          <p className="mt-1 text-xs text-blue-800/90 dark:text-cyan-300/90 sm:text-sm">
            Anyone with the link can sign up and take the same questions.
            You&apos;ll see all attempts ranked by score.
          </p>
        </div>
        {token && attemptCount > 0 && (
          <Link
            href={`/exam/${examId}/leaderboard`}
            className="rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-cyan-700 dark:bg-slate-900 dark:text-cyan-300 dark:hover:bg-slate-800"
          >
            Leaderboard ({attemptCount}) →
          </Link>
        )}
      </div>

      {token && url && !showSettings && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              type="text"
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-mono dark:border-cyan-700 dark:bg-slate-900"
            />
            <button
              type="button"
              onClick={onCopy}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {copied ? "Copied ✓" : "Copy link"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {activeGates.length > 0 ? (
              activeGates.map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-white/70 px-2.5 py-1 text-blue-800 dark:bg-slate-900/70 dark:text-cyan-200"
                >
                  {g}
                </span>
              ))
            ) : (
              <span className="text-blue-800/80 dark:text-cyan-300/80">
                No expiry, candidate cap, or time limit set.
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="ml-auto rounded-md border border-blue-300 bg-white px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-cyan-700 dark:bg-slate-900 dark:text-cyan-300 dark:hover:bg-slate-800"
            >
              Edit limits
            </button>
          </div>
        </>
      )}

      {(showSettings || !token) && (
        <form action={action} className="mt-4 space-y-3">
          <input type="hidden" name="examId" value={examId} />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="block text-xs font-medium text-blue-900 dark:text-cyan-200">
                Expiry date
              </span>
              <input
                type="date"
                name="expiresAt"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="mt-1 w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm dark:border-cyan-700 dark:bg-slate-900"
              />
              <span className="mt-1 block text-[11px] text-blue-700/80 dark:text-cyan-300/80">
                Leave empty for no expiry.
              </span>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-blue-900 dark:text-cyan-200">
                Max candidates
              </span>
              <input
                type="number"
                name="maxTakers"
                value={maxTakers}
                onChange={(e) => setMaxTakers(e.target.value)}
                min={0}
                step={1}
                placeholder="Unlimited"
                className="mt-1 w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm dark:border-cyan-700 dark:bg-slate-900"
              />
              <span className="mt-1 block text-[11px] text-blue-700/80 dark:text-cyan-300/80">
                {attemptCount > 0
                  ? `${attemptCount} taken so far. Empty = unlimited.`
                  : "Leave empty for unlimited."}
              </span>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-blue-900 dark:text-cyan-200">
                Time limit (minutes)
              </span>
              <input
                type="number"
                name="timeLimitMinutes"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                min={0}
                step={1}
                placeholder="Untimed"
                className="mt-1 w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm dark:border-cyan-700 dark:bg-slate-900"
              />
              <span className="mt-1 block text-[11px] text-blue-700/80 dark:text-cyan-300/80">
                Per-attempt timer. Empty = untimed.
              </span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {pending
                ? token
                  ? "Saving…"
                  : "Generating link…"
                : token
                  ? "Save changes"
                  : "Generate share link"}
            </button>
            {token && (
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="rounded-md border border-blue-300 bg-white px-4 py-2 text-sm font-medium dark:border-cyan-700 dark:bg-slate-900"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
