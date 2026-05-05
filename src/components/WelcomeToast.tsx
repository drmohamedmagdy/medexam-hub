"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "mxh_welcome_toast_seen";

/**
 * One-time welcome popup for first-time dashboard visitors.
 *
 * - Slides in from the bottom-right after a 1.5s delay so the user has
 *   a moment to see the dashboard first.
 * - Shows once per device (localStorage flag).
 * - Easy to dismiss; auto-hides after 12s if ignored.
 *
 * Designed to be encouraging, not intrusive.
 */
export default function WelcomeToast({ firstName }: { firstName: string | null }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const open = setTimeout(() => setShow(true), 1500);
    const close = setTimeout(() => dismiss(), 12_000 + 1500);
    return () => {
      clearTimeout(open);
      clearTimeout(close);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore (private mode etc.)
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-sm animate-[slideUp_300ms_ease-out] rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-4 shadow-2xl shadow-blue-600/20 dark:border-cyan-700/40 dark:from-slate-900 dark:to-slate-800 dark:shadow-cyan-500/10 sm:bottom-8 sm:right-8 sm:left-auto sm:mx-0"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div className="pr-6">
        <p className="text-sm font-semibold text-blue-900 dark:text-cyan-300">
          {firstName ? `Welcome, ${firstName}! 👋` : "Welcome to MedExam Hub! 👋"}
        </p>
        <p className="mt-1 text-sm text-blue-800 dark:text-slate-300">
          Generate your first AI exam in 30 seconds — pick a specialty, set difficulty, you&apos;re studying.
        </p>
        <Link
          href="/exam/new"
          onClick={dismiss}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Start now
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
