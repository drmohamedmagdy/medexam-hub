"use client";

import { useRef, useState } from "react";

/**
 * Auto-playing, muted, looping inline video card. Plays on mobile thanks
 * to playsInline + muted. If the source 404s the onError handler swaps
 * to a static gradient placeholder so the page never shows a broken
 * media frame.
 */
export default function FeatureVideo({
  src,
  poster,
  emoji,
  title,
}: {
  src: string;
  poster?: string;
  emoji: string;
  title: string;
}) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLVideoElement | null>(null);

  if (failed) {
    return (
      <div
        className="aspect-[3/4] w-full rounded-lg bg-gradient-to-br from-blue-100 via-cyan-50 to-blue-50 dark:from-blue-950/40 dark:via-cyan-950/30 dark:to-slate-900"
        aria-hidden
      >
        <div className="flex h-full flex-col items-center justify-center gap-2 text-blue-700 dark:text-cyan-300">
          <span className="text-5xl" aria-hidden>{emoji}</span>
          <span className="text-sm font-medium">{title}</span>
        </div>
      </div>
    );
  }

  return (
    /* eslint-disable-next-line jsx-a11y/media-has-caption */
    <video
      ref={ref}
      src={src}
      poster={poster}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      onError={() => setFailed(true)}
      className="aspect-[3/4] w-full rounded-lg bg-zinc-100 object-cover dark:bg-slate-800"
    />
  );
}
