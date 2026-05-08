"use client";

import { useState } from "react";
import type { IntroVideo } from "@/lib/intro-video";

type Highlight = { emoji: string; text: string };

const HIGHLIGHTS: Highlight[] = [
  { emoji: "🎯", text: "AI exam generator — pick specialty, format, difficulty" },
  { emoji: "🧠", text: "Research Assistant for protocols, theses, manuscripts" },
  { emoji: "📊", text: "17 statistical tests on uploaded data, Word export" },
  { emoji: "📚", text: "Free medical library — curated PDFs and notes" },
];

/**
 * Auth-side intro panel: renders the configured intro video (YouTube /
 * Vimeo iframe or local MP4) plus a highlight list. Used on /signup and
 * /login. Set NEXT_PUBLIC_INTRO_VIDEO_URL to swap the video source
 * without code changes.
 */
export default function AuthIntroPanel({
  video,
  heading = "Why MedExam Hub?",
  subheading = "Everything you need for exams, research, and statistics — in one place.",
}: {
  video: IntroVideo;
  heading?: string;
  subheading?: string;
}) {
  return (
    <aside className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur sm:p-5">
      <VideoFrame video={video} />

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

function VideoFrame({ video }: { video: IntroVideo }) {
  const [failed, setFailed] = useState(false);

  if (video.kind === "youtube" || video.kind === "vimeo") {
    return (
      <div className="overflow-hidden rounded-lg bg-black">
        <iframe
          src={video.embedUrl}
          title="MedExam Hub — intro video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="aspect-video w-full"
        />
      </div>
    );
  }

  if (failed) {
    return (
      <div
        aria-hidden
        className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-blue-100 via-cyan-50 to-blue-50 dark:from-blue-950/40 dark:via-cyan-950/30 dark:to-slate-900"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(37,99,235,0.15),transparent_55%)]" />
        <div className="relative flex flex-col items-center gap-2 text-blue-700 dark:text-cyan-300">
          <span
            aria-hidden
            className="grid h-14 w-14 place-items-center rounded-full bg-blue-600/95 text-white shadow-lg"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 translate-x-[1px]" fill="currentColor">
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          </span>
          <span className="text-xs font-medium">Intro video</span>
        </div>
      </div>
    );
  }

  return (
    /* eslint-disable-next-line jsx-a11y/media-has-caption */
    <video
      src={video.src}
      poster={video.poster}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      onError={() => setFailed(true)}
      className="aspect-video w-full rounded-lg bg-zinc-100 object-cover dark:bg-slate-800"
    />
  );
}
