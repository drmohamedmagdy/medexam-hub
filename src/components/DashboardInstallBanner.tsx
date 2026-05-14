"use client";

import { useEffect, useState } from "react";

// Persistent "Install MedExam Hub on your phone?" banner on the dashboard.
// Stays on every visit until the user actually installs the PWA. No
// dismiss button — only an "Install now" CTA that triggers the native
// install dialog directly on Android Chrome.
//
// On iOS Safari (no programmatic install API) or any browser where
// Chrome hasn't fired beforeinstallprompt, the CTA shows a brief
// inline hint pointing to the browser menu instead of a popup modal.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __mxhInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export default function DashboardInstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const ios = isIos();

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    if (window.__mxhInstallPrompt) {
      setDeferred(window.__mxhInstallPrompt);
    }
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      window.__mxhInstallPrompt = evt;
      setDeferred(evt);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    const onInstalled = () => {
      window.__mxhInstallPrompt = null;
      setDeferred(null);
      setInstalled(true);
      setHint(null);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const onInstall = async () => {
    if (deferred) {
      // Direct install — opens Chrome's native install dialog. No modal,
      // no extra prompt from us.
      await deferred.prompt();
      const choice = await deferred.userChoice;
      window.__mxhInstallPrompt = null;
      setDeferred(null);
      if (choice.outcome === "accepted") setInstalled(true);
      return;
    }
    // Fallback: programmatic install not available. Show a brief inline
    // hint instead of opening a modal. iOS Safari gets the Share-button
    // line; everything else gets the generic browser-menu line.
    setHint(
      ios
        ? "Tap the Share button in Safari (square with arrow ↑), then Add to Home Screen."
        : "Open your browser menu (⋮ or ⋯), then tap Install app / Add to Home Screen."
    );
  };

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border-2 border-blue-500 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5 shadow-md dark:border-blue-700 dark:from-blue-950/40 dark:via-zinc-900 dark:to-indigo-950/40 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 flex-none place-items-center rounded-2xl bg-white text-3xl shadow-sm dark:bg-zinc-900">
            📱
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-blue-900 dark:text-blue-200 sm:text-xl">
              Install MedExam Hub on your phone
            </h2>
            <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
              Add MedExam Hub to your home screen for one-tap access,
              full-screen mode, faster cold starts, and offline-safe
              asset caching. No app store, no download — installs
              straight from the browser.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onInstall}
          className="flex-none rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 sm:px-6"
        >
          Install now
        </button>
      </div>
      {hint && (
        <p className="mt-3 rounded-md border border-blue-200 bg-white/70 px-3 py-2 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
          ℹ️ {hint}
        </p>
      )}
    </div>
  );
}
