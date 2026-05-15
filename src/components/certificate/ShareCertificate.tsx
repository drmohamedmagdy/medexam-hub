"use client";

import { useState } from "react";
import { toBlob, toPng } from "html-to-image";

// Captures the certificate DOM as a PNG and shares it as a FILE
// (not as a link). Three execution paths in order of preference:
//
// 1. Native Web Share API with file support — opens the OS share sheet
//    with the PNG attached. Works on modern Chrome (Android), Safari
//    (iOS 15+), and most chromium-based mobile browsers.
//
// 2. Web Share API without file support — fallback to sharing the URL
//    with text, but most modern browsers handle files now.
//
// 3. No share API — download the PNG to the user's device, then they
//    can manually attach it to WhatsApp / Email / wherever.
//
// Either way, the user ends up with the actual image, not a link.

type Props = {
  /** DOM id of the certificate card to capture. */
  targetId: string;
  /** Friendly filename without extension. */
  fileName: string;
  /** Recipient name / score for the share-sheet metadata. */
  shareText: string;
};

const SUPPORTS_FILE_SHARE =
  typeof navigator !== "undefined" &&
  typeof navigator.canShare === "function" &&
  // Probe with a dummy file to confirm the platform really accepts files
  navigator.canShare({ files: [new File([""], "test.png", { type: "image/png" })] });

// 1×1 transparent PNG used as fallback when an external resource the
// library tries to inline can't be fetched. Tells html-to-image "treat
// this as loaded, just skip it" instead of throwing "Failed to fetch".
const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const CAPTURE_OPTS = {
  pixelRatio: 2,
  cacheBust: false,
  skipFonts: true,
  backgroundColor: "#ffffff",
  imagePlaceholder: TRANSPARENT_PIXEL,
  filter: (n: HTMLElement | Node) => {
    if (!(n instanceof Element)) return true;
    const tag = n.tagName?.toLowerCase();
    if (tag === "link" || tag === "style") return false;
    return true;
  },
};

async function captureAsBlob(targetId: string): Promise<Blob> {
  const node = document.getElementById(targetId);
  if (!node) throw new Error("Certificate not found on page");

  // Wait for any <img> descendants to finish loading before snapshotting.
  // html-to-image will substitute the placeholder for not-yet-loaded
  // images, which gives a blank logo. Wait briefly so the real image
  // makes it in.
  await waitForImages(node);

  // Prefer toBlob — avoids the dataUrl → fetch round-trip in toPng,
  // which is what was producing the "Failed to fetch" message even
  // when the actual capture had succeeded.
  try {
    const blob = await toBlob(node, CAPTURE_OPTS);
    if (blob) return blob;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[ShareCertificate] toBlob failed, falling back to toPng:", e);
  }

  // Fallback: toPng + manual conversion (older browsers / edge cases).
  const dataUrl = await toPng(node, CAPTURE_OPTS);
  const res = await fetch(dataUrl);
  return await res.blob();
}

async function waitForImages(node: HTMLElement): Promise<void> {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) return resolve();
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            resolve();
          };
          img.addEventListener("load", finish, { once: true });
          img.addEventListener("error", finish, { once: true });
          // Safety timeout so a hung image doesn't block the capture forever.
          setTimeout(finish, 3000);
        })
    )
  );
}

export default function ShareCertificate({ targetId, fileName, shareText }: Props) {
  const [busy, setBusy] = useState<null | "sharing" | "downloading">(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | "shared" | "downloaded">(null);

  const onShare = async () => {
    setBusy("sharing");
    setError(null);
    setDone(null);
    try {
      const blob = await captureAsBlob(targetId);
      const file = new File([blob], `${fileName}.png`, { type: "image/png" });

      if (typeof navigator !== "undefined" && "share" in navigator) {
        // Re-check with the actual file because some platforms reject
        // certain MIME types even when canShare()→true on the probe.
        if (typeof navigator.canShare === "function" && !navigator.canShare({ files: [file] })) {
          throw new Error("share-files-rejected");
        }
        await navigator.share({
          title: "MedExam Hub Certificate",
          text: shareText,
          files: [file],
        });
        setDone("shared");
      } else {
        // No Web Share API at all — download instead.
        triggerDownload(blob, `${fileName}.png`);
        setDone("downloaded");
      }
    } catch (e) {
      // User-cancelled share throws AbortError; treat it as silent.
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("abort")) {
        setBusy(null);
        return;
      }
      // eslint-disable-next-line no-console
      console.error("[ShareCertificate] share path failed:", e);
      // Anything else: fall back to download so the user still gets the image.
      try {
        const blob = await captureAsBlob(targetId);
        triggerDownload(blob, `${fileName}.png`);
        setDone("downloaded");
      } catch (e2) {
        // eslint-disable-next-line no-console
        console.error("[ShareCertificate] capture failed too:", e2);
        setError(
          e2 instanceof Error
            ? `${e2.message} — check the browser console for details.`
            : "Couldn't generate the image — check the browser console."
        );
      }
    } finally {
      setBusy(null);
    }
  };

  const onDownload = async () => {
    setBusy("downloading");
    setError(null);
    setDone(null);
    try {
      const blob = await captureAsBlob(targetId);
      triggerDownload(blob, `${fileName}.png`);
      setDone("downloaded");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[ShareCertificate] download path failed:", e);
      setError(
        e instanceof Error
          ? `${e.message} — check the browser console for details.`
          : "Couldn't generate the image"
      );
    } finally {
      setBusy(null);
    }
  };

  // Per-platform share. Auto-downloads the PNG so the user has the
  // image file in hand, then opens the platform's compose dialog in a
  // new tab. Platforms with URL-based image upload don't exist for
  // social media — even LinkedIn / Facebook / Instagram require the
  // user to manually attach the image in their composer. This flow
  // gets the PNG onto their device + opens the right composer in one
  // click; user finishes the post.
  const SITE = "https://medexamhub.org";
  const FALLBACK_TEXT =
    shareText || `Look at my MedExam Hub certificate! 🎓 ${SITE}`;

  const onPlatformShare = async (platform:
    | "whatsapp"
    | "facebook"
    | "linkedin"
    | "twitter"
    | "telegram"
    | "instagram"
  ) => {
    setBusy("sharing");
    setError(null);
    setDone(null);
    try {
      const blob = await captureAsBlob(targetId);
      triggerDownload(blob, `${fileName}.png`);

      const composeUrl = (() => {
        const text = encodeURIComponent(FALLBACK_TEXT);
        const url = encodeURIComponent(SITE);
        switch (platform) {
          case "whatsapp":
            return `https://wa.me/?text=${encodeURIComponent(`${FALLBACK_TEXT}\n\n${SITE}`)}`;
          case "facebook":
            return `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`;
          case "linkedin":
            return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
          case "twitter":
            return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
          case "telegram":
            return `https://t.me/share/url?url=${url}&text=${text}`;
          case "instagram":
            // Instagram has no URL share — just open their website so the
            // user can create a post. The downloaded image is ready to attach.
            return "https://www.instagram.com/";
        }
      })();

      // Open the platform's compose dialog in a new tab. The user
      // attaches the just-downloaded PNG manually inside that composer.
      window.open(composeUrl, "_blank", "noopener,noreferrer");
      setDone("downloaded");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[ShareCertificate] ${platform} share failed:`, e);
      setError(
        e instanceof Error
          ? `${e.message} — check the browser console for details.`
          : "Couldn't generate the image"
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="no-print mt-6 flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onShare}
          disabled={busy !== null}
          className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
        >
          {busy === "sharing"
            ? "📸 Capturing..."
            : SUPPORTS_FILE_SHARE
              ? "📤 Share certificate"
              : "📥 Download & share"}
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={busy !== null}
          className="rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          {busy === "downloading" ? "Capturing..." : "💾 Download PNG"}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          🖨 Print
        </button>
      </div>

      {/* Per-platform share row — image downloads + composer opens.
          User attaches the PNG inside the platform's composer (no
          social network accepts image uploads via URL share intent). */}
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-[10px] uppercase tracking-wide text-zinc-500">
          Or post directly to
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onPlatformShare("whatsapp")}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-800 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60"
            title="Download image + open WhatsApp"
          >
            💬 WhatsApp
          </button>
          <button
            type="button"
            onClick={() => onPlatformShare("facebook")}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium hover:bg-blue-100 disabled:opacity-60 dark:border-blue-800 dark:bg-blue-950/40"
            title="Download image + open Facebook composer"
          >
            📘 Facebook
          </button>
          <button
            type="button"
            onClick={() => onPlatformShare("linkedin")}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-md border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-medium hover:bg-sky-100 disabled:opacity-60 dark:border-sky-800 dark:bg-sky-950/40"
            title="Download image + open LinkedIn"
          >
            💼 LinkedIn
          </button>
          <button
            type="button"
            onClick={() => onPlatformShare("instagram")}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-md border border-pink-300 bg-gradient-to-r from-pink-50 via-rose-50 to-purple-50 px-3 py-1.5 text-xs font-medium hover:from-pink-100 hover:via-rose-100 hover:to-purple-100 disabled:opacity-60 dark:border-pink-800 dark:from-pink-950/40 dark:via-rose-950/40 dark:to-purple-950/40"
            title="Download image + open Instagram"
          >
            📸 Instagram
          </button>
          <button
            type="button"
            onClick={() => onPlatformShare("twitter")}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800/50"
            title="Download image + open Twitter / X"
          >
            𝕏 Twitter
          </button>
          <button
            type="button"
            onClick={() => onPlatformShare("telegram")}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-md border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-medium hover:bg-cyan-100 disabled:opacity-60 dark:border-cyan-800 dark:bg-cyan-950/40"
            title="Download image + open Telegram"
          >
            ✈️ Telegram
          </button>
        </div>
      </div>

      {done === "shared" && (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          ✓ Shared — the image is now in the conversation you picked.
        </p>
      )}
      {done === "downloaded" && (
        <p className="max-w-md text-center text-xs text-zinc-600 dark:text-zinc-400">
          ✓ <strong>Image saved to your downloads.</strong> In the composer
          that just opened, click <strong>add photo / attachment</strong>{" "}
          and pick the file you just downloaded.
        </p>
      )}
      {error && (
        <p className="text-xs text-red-700 dark:text-red-300">✗ {error}</p>
      )}
    </div>
  );
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
