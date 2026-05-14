"use client";

import { useEffect, useState } from "react";

// Always-visible "Install as app" button on the dashboard. Stays put so
// any user — new or returning — can install at any time, not just once.
// Hides itself only when the user is already inside the installed PWA
// (display-mode: standalone), since asking someone to install the app
// they're already using would be silly.
//
// On Android Chrome / Edge / Samsung Internet, clicking opens the
// native install dialog via the cached beforeinstallprompt event.
// On iOS Safari, clicking opens a small popover with the manual
// Share → Add to Home Screen steps (no programmatic install on iOS).

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

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
  const [hideInStandalone, setHideInStandalone] = useState(false);
  const [showIosPopover, setShowIosPopover] = useState(false);
  const ios = isIos();

  useEffect(() => {
    if (isStandalone()) {
      setHideInStandalone(true);
      return;
    }
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    // Clear deferred once installed so we hide on this tab too.
    const onInstalled = () => {
      setDeferred(null);
      setHideInStandalone(true);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hideInStandalone) return null;

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    if (ios) {
      setShowIosPopover(true);
      return;
    }
    // Desktop browser without beforeinstallprompt support — tell the
    // user how to install manually via the browser menu.
    setShowIosPopover(true);
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/30 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-white text-2xl shadow-sm dark:bg-zinc-900">
            📱
          </span>
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              Install MedExam Hub on your phone
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-300">
              One-tap home-screen icon, full-screen mode, faster cold starts.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClick}
          className="flex-none rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          {deferred || ios ? "Install" : "Show me how"}
        </button>
      </div>

      {showIosPopover && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6 pt-20 sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowIosPopover(false);
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
                <li>Confirm — the app icon appears on your home screen.</li>
              </ol>
            )}
            <p className="mt-4 text-xs text-zinc-500">
              Once installed, open MedExam Hub from your home screen for a
              full-screen, app-like experience.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowIosPopover(false)}
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
