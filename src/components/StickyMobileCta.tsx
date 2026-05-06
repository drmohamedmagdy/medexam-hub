"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Always-visible signup CTA pinned to the bottom of the viewport on mobile,
 * shown only on the landing page. Hidden on screens >= sm so we don't
 * compete with the inline CTAs the user already sees on desktop. Slides
 * up after the user scrolls past the hero so it doesn't obscure the
 * primary above-the-fold call-to-action on first paint.
 */
export default function StickyMobileCta({
  ctaLabel,
  plansLabel,
}: {
  ctaLabel: string;
  plansLabel: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 320);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950/95 sm:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-2">
        <Link
          href="/signup"
          className="flex-1 rounded-full bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/30"
        >
          {ctaLabel} →
        </Link>
        <Link
          href="/plans"
          className="rounded-full border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 dark:border-slate-700 dark:text-slate-200"
        >
          {plansLabel}
        </Link>
      </div>
    </div>
  );
}
