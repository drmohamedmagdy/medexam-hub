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
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-950/40 sm:px-4">
      <div className="flex items-center gap-2.5">
        <span className="text-lg" aria-hidden>📱</span>
        <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
          Install MedExam Hub on your phone
        </p>
      </div>
      <button
        type="button"
        onClick={onInstall}
        className="flex-none rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
      >
        Install
      </button>
      {hint && (
        <p className="mt-1 w-full rounded-md border border-blue-200 bg-white/70 px-2.5 py-1.5 text-[11px] text-blue-900 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
          ℹ️ {hint}
        </p>
      )}
    </div>
  );
}
