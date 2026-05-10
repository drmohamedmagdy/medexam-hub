"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function pad(n: number): string {
  return String(Math.max(0, n)).padStart(2, "0");
}

function diffParts(target: number) {
  const diff = Math.max(0, target - Date.now());
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { diff, days, hours, minutes, seconds };
}

export default function PromoCountdownBanner({
  discountPct,
  endsAtIso,
}: {
  discountPct: number;
  endsAtIso: string;
}) {
  const target = new Date(endsAtIso).getTime();
  const [parts, setParts] = useState(() => diffParts(target));

  useEffect(() => {
    const id = setInterval(() => {
      setParts(diffParts(target));
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (parts.diff <= 0) return null;

  // Show days only when the campaign is more than 24h out — otherwise
  // a flat HH:MM:SS reads cleaner.
  const showDays = parts.days > 0;
  const totalHours = showDays ? parts.hours : parts.days * 24 + parts.hours;

  return (
    <Link
      href="/plans"
      className="block bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 text-amber-950 transition hover:from-amber-300 hover:via-orange-300 hover:to-amber-300"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-xs font-semibold sm:text-sm">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden>⚡</span>
          <span>
            Up to <strong>{discountPct}% OFF</strong> all plans
          </span>
        </span>
        <span aria-hidden className="text-amber-900/60">
          ·
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-900/70 sm:text-xs">
            ENDS IN
          </span>
          {showDays && (
            <>
              <span className="rounded-md bg-amber-900/15 px-1.5 py-0.5 text-amber-950">
                {pad(parts.days)}
              </span>
              <span className="text-amber-900/60">d</span>
            </>
          )}
          <span className="rounded-md bg-amber-900/15 px-1.5 py-0.5 text-amber-950">
            {pad(totalHours)}
          </span>
          <span className="text-amber-900/60">:</span>
          <span className="rounded-md bg-amber-900/15 px-1.5 py-0.5 text-amber-950">
            {pad(parts.minutes)}
          </span>
          <span className="text-amber-900/60">:</span>
          <span className="rounded-md bg-amber-900/15 px-1.5 py-0.5 text-amber-950">
            {pad(parts.seconds)}
          </span>
        </span>
        <span aria-hidden className="text-amber-900/60">
          ·
        </span>
        <span className="underline underline-offset-2">claim it →</span>
      </div>
    </Link>
  );
}
