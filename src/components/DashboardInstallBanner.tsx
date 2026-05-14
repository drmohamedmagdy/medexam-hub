"use client";

import { useEffect, useState } from "react";

// Persistent "Install MedExam Hub on your phone?" banner on the dashboard.
// Shows on every visit until the user actually installs the PWA — there's
// no dismiss button on purpose. The banner disappears the moment the
// install completes (appinstalled event) or if we detect the page is
// already running in the installed app (display-mode: standalone).
//
// On Android / Chromium: clicking the CTA opens the native install dialog
// directly via the cached beforeinstallprompt event (captured in <head>
// before hydration so we never miss it).
//
// On iOS Safari: Apple gives no programmatic install API, so we open a
// modal popover with the manual Share → Add to Home Screen steps. The
// banner stays until the user installs and revisits in standalone mode.

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
  const [showInstructions, setShowInstructions] = useState(false);
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
      setShowInstructions(false);
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
      await deferred.prompt();
      const choice = await deferred.userChoice;
      // beforeinstallprompt is one-shot per Chrome's spec. Null it so a
      // second click doesn't try to re-use a spent event.
      window.__mxhInstallPrompt = null;
      setDeferred(null);
      if (choice.outcome === "accepted") {
        // appinstalled event will fire and hide the banner; here we just
        // optimistically dismiss in case the event is slow.
        setInstalled(true);
      }
      return;
    }
    // iOS or desktop without beforeinstallprompt — show manual steps.
    setShowInstructions(true);
  };

  return (
    <>
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
      </div>

      {showInstructions && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6 pt-20 sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowInstructions(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-900 sm:p-6">
            <h2 className="text-base font-semibold">
              {ios ? "Install on iPhone / iPad" : "Install from the browser menu"}
            </h2>
            {ios ? (
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
                <li>
                  Tap the <span className="font-semibold">Share</span> button at
                  the bottom of Safari (the square with an arrow pointing up).
                </li>
                <li>
                  Scroll down and tap{" "}
                  <span className="font-semibold">Add to Home Screen</span>.
                </li>
                <li>
                  Tap <span className="font-semibold">Add</span> in the top
                  right. MedExam Hub will appear as an icon on your home screen.
                </li>
              </ol>
            ) : (
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
                <li>
                  Open your browser&apos;s menu (the{" "}
                  <span className="font-semibold">⋮</span> or{" "}
                  <span className="font-semibold">⋯</span> icon).
                </li>
                <li>
                  Pick <span className="font-semibold">Install app</span> or{" "}
                  <span className="font-semibold">Add to Home Screen</span>.
                </li>
                <li>
                  Confirm — the app icon appears on your home screen and the
                  banner here will disappear next time you open the app.
                </li>
              </ol>
            )}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
