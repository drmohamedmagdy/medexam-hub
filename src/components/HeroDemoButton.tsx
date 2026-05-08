"use client";

import { useEffect, useState } from "react";
import type { IntroVideo } from "@/lib/intro-video";

/**
 * "Watch demo" button that opens a video lightbox. Accepts the resolved
 * intro video so a YouTube / Vimeo URL set via NEXT_PUBLIC_INTRO_VIDEO_URL
 * embeds as an iframe; otherwise plays the local /demo/hero.mp4.
 */
export default function HeroDemoButton({
  video,
  label,
  closeLabel = "Close",
}: {
  video: IntroVideo;
  label: string;
  closeLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white/70 px-6 py-3.5 text-base font-medium backdrop-blur transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-900"
      >
        <span aria-hidden className="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-white">
          <svg viewBox="0 0 24 24" className="h-3 w-3 translate-x-[1px]" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
        </span>
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
        >
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-black shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={closeLabel}
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-white hover:bg-black/90"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </svg>
            </button>
            {video.kind === "youtube" || video.kind === "vimeo" ? (
              <iframe
                src={`${video.embedUrl}${video.embedUrl.includes("?") ? "&" : "?"}autoplay=1`}
                title="MedExam Hub — demo video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="aspect-video w-full bg-black"
              />
            ) : (
              /* eslint-disable-next-line jsx-a11y/media-has-caption */
              <video
                src={video.src}
                poster={video.poster}
                controls
                autoPlay
                playsInline
                className="aspect-video w-full bg-black"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
