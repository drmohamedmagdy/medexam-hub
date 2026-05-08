"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  enableShareAction,
  type ShareState,
} from "@/app/actions/exam-share";

export default function ShareExamCard({
  examId,
  initialToken,
  initialUrl,
  attemptCount,
}: {
  examId: string;
  initialToken: string | null;
  initialUrl: string | null;
  attemptCount: number;
}) {
  const [token, setToken] = useState(initialToken);
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function onShare() {
    setError(null);
    const fd = new FormData();
    fd.set("examId", examId);
    startTransition(async () => {
      const result: ShareState = await enableShareAction(fd);
      if (result?.ok) {
        setToken(result.token);
        setUrl(result.url);
      } else if (result?.error) {
        setError(result.error);
      }
    });
  }

  async function onCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Browser may have blocked clipboard — selecting the text manually still works.
    }
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

      {!token ? (
        <button
          type="button"
          onClick={onShare}
          disabled={pending}
          className="mt-4 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Generating link…" : "Generate share link"}
        </button>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            readOnly
            value={url ?? ""}
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
      )}

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
