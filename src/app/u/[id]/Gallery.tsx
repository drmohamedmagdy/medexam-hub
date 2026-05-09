"use client";

import { useCallback, useEffect, useState } from "react";

type Item = {
  id: string;
  kind: string;
  url: string;
  mimeType: string;
  caption: string | null;
};

export default function Gallery({ items }: { items: Item[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const active = activeIdx !== null ? items[activeIdx] : null;

  const close = useCallback(() => setActiveIdx(null), []);
  const prev = useCallback(
    () =>
      setActiveIdx((i) =>
        i === null ? null : (i - 1 + items.length) % items.length
      ),
    [items.length]
  );
  const next = useCallback(
    () => setActiveIdx((i) => (i === null ? null : (i + 1) % items.length)),
    [items.length]
  );

  // Keyboard nav while open: ESC to close, ←/→ to navigate.
  useEffect(() => {
    if (active === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close, prev, next]);

  // Lock background scroll while the lightbox is open.
  useEffect(() => {
    if (active === null) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [active]);

  return (
    <>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m, idx) => (
          <figure
            key={m.id}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          >
            <button
              type="button"
              onClick={() => setActiveIdx(idx)}
              aria-label={
                m.kind === "video"
                  ? "Open video full screen"
                  : "Open image full size"
              }
              className="block w-full cursor-zoom-in"
            >
              {m.kind === "video" ? (
                /* eslint-disable-next-line jsx-a11y/media-has-caption */
                <video
                  src={m.url}
                  preload="metadata"
                  // muted+playsInline so the inline frame stays still and
                  // doesn't try to grab focus or audio when scrolled past.
                  muted
                  playsInline
                  className="pointer-events-none aspect-video w-full bg-zinc-100 object-cover dark:bg-zinc-800"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={m.url}
                  alt={m.caption ?? ""}
                  loading="lazy"
                  className="aspect-video w-full bg-zinc-100 object-cover transition hover:opacity-90 dark:bg-zinc-800"
                />
              )}
            </button>
            {m.caption && (
              <figcaption className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                {m.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {active && activeIdx !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Media viewer"
          onClick={close}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            aria-label="Close"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
          >
            ×
          </button>

          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Previous"
                className="absolute left-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20 sm:left-4"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Next"
                className="absolute right-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20 sm:right-4"
              >
                ›
              </button>
            </>
          )}

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] max-w-[95vw] flex-col items-center"
          >
            {active.kind === "video" ? (
              /* eslint-disable-next-line jsx-a11y/media-has-caption */
              <video
                src={active.url}
                controls
                autoPlay
                playsInline
                className="max-h-[85vh] max-w-[95vw]"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={active.url}
                alt={active.caption ?? ""}
                className="max-h-[85vh] max-w-[95vw] object-contain"
              />
            )}
            {active.caption && (
              <p className="mt-3 max-w-2xl text-center text-sm text-white/80">
                {active.caption}
              </p>
            )}
            {items.length > 1 && (
              <p className="mt-1 text-xs text-white/50">
                {activeIdx + 1} / {items.length}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
