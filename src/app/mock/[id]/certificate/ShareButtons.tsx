"use client";

// Social-share row for the certificate page. Uses URL-based intent
// schemes for each platform — no SDK, no tracking pixels, no extra
// bundle weight. Opens the share dialog in a new tab.
//
// The certificate page URL itself is /account/orders/.../invoice
// or /mock/<id>/certificate (auth-required), so we don't share THAT —
// we share medexamhub.org with a celebratory message instead. That
// drives signups, which is the actual viral loop we want.

const SITE = "https://medexamhub.org";

export default function ShareButtons({
  templateLabel,
  score,
}: {
  templateLabel: string;
  score: number;
}) {
  const text = `I just passed ${templateLabel} at ${score}% on MedExam Hub 🎓 — AI-generated medical exam prep.`;
  const url = SITE;

  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
  const twitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  // LinkedIn ignores summary text from external links now — just shares
  // the URL and pulls our Open Graph meta. The hand-typed text in the
  // post is what users add themselves.
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  const telegram = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;

  // Native share API on mobile if available — Android Chrome / iOS Safari
  // both support navigator.share which opens the system share sheet.
  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "MedExam Hub", text, url });
      } catch {
        // user cancelled, fine
      }
    }
  };
  const hasNative =
    typeof window !== "undefined" && "share" in window.navigator;

  return (
    <div className="no-print mt-6 flex flex-wrap items-center justify-center gap-2">
      <span className="text-xs uppercase tracking-wide text-zinc-500 sm:me-2">
        Share:
      </span>
      <a
        href={facebook}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:border-blue-400 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-blue-950/40"
        aria-label="Share to Facebook"
      >
        <span className="text-base">📘</span> Facebook
      </a>
      <a
        href={linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:border-blue-400 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-blue-950/40"
        aria-label="Share to LinkedIn"
      >
        <span className="text-base">💼</span> LinkedIn
      </a>
      <a
        href={whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:border-emerald-400 hover:bg-emerald-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-emerald-950/40"
        aria-label="Share to WhatsApp"
      >
        <span className="text-base">💬</span> WhatsApp
      </a>
      <a
        href={telegram}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:border-cyan-400 hover:bg-cyan-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-cyan-950/40"
        aria-label="Share to Telegram"
      >
        <span className="text-base">✈️</span> Telegram
      </a>
      <a
        href={twitter}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        aria-label="Share to Twitter / X"
      >
        <span className="text-base">𝕏</span> Twitter
      </a>
      {hasNative && (
        <button
          type="button"
          onClick={nativeShare}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          aria-label="More sharing options"
        >
          <span>📤</span> More…
        </button>
      )}
    </div>
  );
}
