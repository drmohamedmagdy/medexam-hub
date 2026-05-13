"use client";

import { useEffect } from "react";

// Registers /sw.js in production. Required so:
//   - Chrome / Edge expose the built-in "Install app" menu item
//   - Static asset cache (logo, _next/static/*) survives flaky networks
//   - The Trusted Web Activity wrapping (Play Store submission) verifies
//
// No UI — we deliberately don't surface an install banner; users who want
// to install can use the browser's own menu.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Best-effort. PWA install + asset cache silently degrade if this
      // fails (typically due to an ad-blocker rule).
    });
  }, []);
  return null;
}
