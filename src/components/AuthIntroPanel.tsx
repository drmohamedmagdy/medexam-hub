"use client";

import { useState } from "react";

type Highlight = { emoji: string; text: string };

const HIGHLIGHTS: Highlight[] = [
  { emoji: "🎯", text: "AI exam generator — pick specialty, format, difficulty" },
  { emoji: "🧠", text: "Research Assistant for protocols, theses, manuscripts" },
  { emoji: "📊", text: "17 statistical tests on uploaded data, Word export" },
  { emoji: "📚", text: "Free medical library — curated PDFs and notes" },
];

/**
 * Auth-side intro panel: autoplay muted looping video on top, plus a
 * highlight list. Used on /signup and /login. Falls back to a static
 * gradient + emoji if the video can't load.
 */
export default function AuthIntroPanel({
  src = "/demo/hero.mp4",
  poster = "/demo/hero-poster.jpg",
  heading = "Why MedExam Hub?",
  subheading = "Everything you need for exams, research, and statistics — in one place.",
}: {
  src?: string;
  poster?: string;
  heading?: string;
  subheading?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <aside className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur sm:p-5">
      {failed ? (
        <div
          aria-hidden
          className="flex aspect-video w-full items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 via-cyan-50 to-blue-50 dark:from-blue-950/40 dark:via-cyan-950/30 dark:to-slate-900"
        >
          <span className="text-5xl">🎯</span>
        </div>
      ) : (
        /* eslint-disable-next-line jsx-a11y/media-has-caption */
        <video
          src={src}
          poster={poster}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
          className="aspect-video w-full rounded-lg bg-zinc-100 object-cover dark:bg-slate-800"
        />
      )}

      <div className="mt-4">
        <h2 className="text-base font-semibold sm:text-lg">{heading}</h2>
        <p className="mt-1 text-xs text-zinc-600 dark:text-slate-400 sm:text-sm">
          {subheading}
        </p>
      </div>

      <ul className="mt-3 space-y-2">
        {HIGHLIGHTS.map((h) => (
          <li
            key={h.text}
            className="flex items-start gap-2 text-xs text-zinc-700 dark:text-slate-300 sm:text-sm"
          >
            <span aria-hidden className="text-base leading-none">
              {h.emoji}
            </span>
            <span>{h.text}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 dark:text-slate-400 sm:text-xs">
        <span className="inline-flex items-center gap-1">
          <span className="text-emerald-600 dark:text-emerald-400">✓</span>
          2 free exams
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="text-emerald-600 dark:text-emerald-400">✓</span>
          No credit card
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="text-emerald-600 dark:text-emerald-400">✓</span>
          Cancel anytime
        </span>
      </p>
    </aside>
  );
}
