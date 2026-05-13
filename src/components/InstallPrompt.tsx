"use client";

import { useEffect, useState } from "react";

// Tiny "Install MedExam Hub" banner that appears the first time Chrome /
// Edge / Android tells us the app is installable (the beforeinstallprompt
// event). Dismissals are remembered in localStorage so we don't pester
// users who said no.
//
// Also registers the service worker on mount — the manifest + a registered
// SW are what make the browser fire beforeinstallprompt in the first place.
//
// iOS Safari doesn't fire beforeinstallprompt; we show a small one-time
// hint there pointing them to Share → Add to Home Screen instead.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "mxh_install_dismissed";
const DISMISSED_TTL_MS = 14 * 24 * 60 * 60 * 1000; // re-ask 2 weeks later

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // Both Chrome / Edge and iOS Safari standalone detection.
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isDismissedRecently(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(DISMISSED_KEY);
  if (!raw) return false;
  const ts = Number.parseInt(raw, 10);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < DISMISSED_TTL_MS;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  // Register the service worker. Only in production builds — in dev the SW
  // can interfere with hot-reload and cached stale chunks.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Best-effort; PWA install still works if the registration races.
    });
  }, []);

  // Capture the install-prompt event (Chrome / Edge / Android).
  useEffect(() => {
    if (isStandalone() || isDismissedRecently()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS Safari path — show the manual hint once.
    if (isIos() && !isStandalone()) {
      setShowIosHint(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {}
    setDeferred(null);
    setShowIosHint(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      // User installed; clear the dismissed flag in case they ever
      // uninstall and reinstall.
      try {
        localStorage.removeItem(DISMISSED_KEY);
      } catch {}
    } else {
      // Treat decline as dismissal so we stop nagging this session.
      try {
        localStorage.setItem(DISMISSED_KEY, String(Date.now()));
      } catch {}
    }
    setDeferred(null);
  };

  if (!deferred && !showIosHint) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:bottom-4 sm:right-4 sm:left-auto sm:px-0 sm:pb-0">
      <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl ring-1 ring-black/5 dark:border-zinc-700 dark:bg-zinc-900">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-blue-50 text-2xl dark:bg-blue-950/60">
          📱
        </span>
        <div className="flex-1 text-sm">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
            Install MedExam Hub
          </p>
          {deferred ? (
            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              Add to your home screen for one-tap access, full-screen mode,
              and faster loads.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              Tap{" "}
              <span aria-label="Share button" className="font-semibold">
                Share
              </span>{" "}
              in Safari then{" "}
              <span className="font-semibold">Add to Home Screen</span>.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {deferred && (
              <button
                type="button"
                onClick={install}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Install
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {deferred ? "Not now" : "Got it"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
