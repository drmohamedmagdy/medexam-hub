"use client";

import { useEffect, useState } from "react";

// "Install as an app?" banner — shown ONLY on the dashboard at the top
// of the page (not floating, not on study screens). Asks once, remembers
// the answer in localStorage. Designed to be ignorable.
//
// The old InstallPrompt floated globally and ended up on top of mock-exam
// questions; users (rightly) hated it. This version is a quiet inline
// banner the user actively sees on the dashboard hero and can dismiss in
// one tap.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "mxh_install_banner_dismissed_v2";

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

function isDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DISMISSED_KEY) === "1";
}

export default function DashboardInstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS Safari path — show the manual-steps banner.
    if (isIos() && !isStandalone()) {
      setShowIosHint(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {}
    setDeferred(null);
    setShowIosHint(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      try {
        localStorage.removeItem(DISMISSED_KEY);
      } catch {}
    } else {
      // Treat decline as dismissal — don't re-ask.
      try {
        localStorage.setItem(DISMISSED_KEY, "1");
      } catch {}
    }
    setDeferred(null);
  };

  if (!deferred && !showIosHint) return null;

  return (
    <div className="mb-6 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 dark:border-blue-900 dark:from-blue-950/40 dark:to-indigo-950/40 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-white text-2xl shadow-sm dark:bg-zinc-900">
            📱
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-blue-900 dark:text-blue-200">
              Install MedExam Hub on your phone?
            </p>
            {deferred ? (
              <p className="mt-0.5 text-sm text-blue-800 dark:text-blue-300">
                Add to your home screen for one-tap access, full-screen mode,
                offline-safe asset cache, and faster cold starts. No app
                store, no download — installs straight from the browser.
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-blue-800 dark:text-blue-300">
                Tap the <span className="font-semibold">Share</span> button
                in Safari, then{" "}
                <span className="font-semibold">Add to Home Screen</span> to
                get the app-like experience on your iPhone.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-none gap-2">
          {deferred && (
            <button
              type="button"
              onClick={install}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Yes, install
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-white dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/60"
          >
            {deferred ? "No thanks" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}
