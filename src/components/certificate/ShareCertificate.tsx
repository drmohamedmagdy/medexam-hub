"use client";

import { useState } from "react";
import { toPng } from "html-to-image";

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

async function captureAsBlob(targetId: string): Promise<Blob> {
  const node = document.getElementById(targetId);
  if (!node) throw new Error("Certificate not found on page");
  // 2x pixel ratio = crisp on Retina screens + when printed.
  //
  // skipFonts: html-to-image tries to fetch + inline @font-face rules
  // from any stylesheet on the page. If ANY rule's src URL fails CORS
  // or 404s, the whole capture throws "Failed to fetch". We don't need
  // embedded fonts — the cert renders fine with system fonts in the
  // output PNG — so skip the entire dance.
  //
  // filter: also skip any <link> or <style> nodes whose import we don't
  // control. Belt-and-braces against rogue third-party styles.
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    skipFonts: true,
    backgroundColor: "#ffffff",
    // Tell html-to-image to load images with CORS=anonymous so the
    // /logo.png in the cert can be tainted-free.
    fetchRequestInit: { mode: "cors", credentials: "omit" },
    filter: (n) => {
      if (!(n instanceof Element)) return true;
      const tag = n.tagName?.toLowerCase();
      // Don't try to inline external stylesheets — they're the source
      // of the failed fetches.
      if (tag === "link" || tag === "style") return false;
      return true;
    },
  });
  const res = await fetch(dataUrl);
  return await res.blob();
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
      // Anything else: fall back to download so the user still gets the image.
      try {
        const blob = await captureAsBlob(targetId);
        triggerDownload(blob, `${fileName}.png`);
        setDone("downloaded");
      } catch (e2) {
        setError(e2 instanceof Error ? e2.message : "Couldn't generate the image");
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
      setError(e instanceof Error ? e.message : "Couldn't generate the image");
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

      {done === "shared" && (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          ✓ Shared — the image is now in the conversation you picked.
        </p>
      )}
      {done === "downloaded" && (
        <p className="text-center text-xs text-zinc-600 dark:text-zinc-400">
          ✓ Saved to your downloads.
          <br />
          Open WhatsApp / Facebook / Instagram → new post → attach the PNG.
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
