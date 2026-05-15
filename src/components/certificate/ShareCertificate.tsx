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
