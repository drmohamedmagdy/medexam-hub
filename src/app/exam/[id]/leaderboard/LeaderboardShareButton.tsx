"use client";

import { useState } from "react";

// "Share top 3 podium" button on the per-exam leaderboard. Opens a
// modal with social-share intents pre-loaded with a celebratory
// message announcing the top 3 takers. The owner of the share link
// taps Share → posts go out → drives traffic back to the shared exam
// URL (medexamhub.org/e/<shareToken>).

type Top3Entry = {
  rank: 1 | 2 | 3;
  name: string;
  score: number;
};

export default function LeaderboardShareButton({
  examTitle,
  shareUrl,
  podium,
}: {
  examTitle: string;
  shareUrl: string;
  podium: Top3Entry[];
}) {
  const [open, setOpen] = useState(false);
  if (podium.length === 0) return null;

  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const podiumText = podium
    .map((p) => `${medals[p.rank]} ${p.name} — ${p.score}%`)
    .join("\n");
  const shareText =
    `🏆 Top performers on my "${examTitle}" exam on MedExam Hub:\n\n` +
    podiumText +
    `\n\nTake it yourself 👉`;

  const fullText = `${shareText} ${shareUrl}`;

  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
  const telegram = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
  const twitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `Top 3 — ${examTitle}`,
          text: shareText,
          url: shareUrl,
        });
        setOpen(false);
      } catch {}
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
    } catch {}
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        📢 Share top 3
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6 pt-20 sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-900 sm:p-6">
            <h2 className="text-base font-semibold">Share top 3</h2>
            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
              {shareText}
              {"\n"}
              {shareUrl}
            </pre>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60"
              >
                💬 WhatsApp
              </a>
              <a
                href={facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-medium hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40"
              >
                📘 Facebook
              </a>
              <a
                href={linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-medium hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40"
              >
                💼 LinkedIn
              </a>
              <a
                href={telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-medium hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-950/40"
              >
                ✈️ Telegram
              </a>
              <a
                href={twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/50"
              >
                𝕏 Twitter
              </a>
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                📋 Copy text
              </button>
            </div>

            {typeof window !== "undefined" && "share" in window.navigator && (
              <button
                type="button"
                onClick={nativeShare}
                className="mt-3 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                📤 Open native share sheet
              </button>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
