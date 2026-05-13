// MedExam Hub Service Worker
// Minimal implementation: satisfies the PWA installability criterion and
// adds a tiny offline-fallback cache. We deliberately DON'T aggressive-
// cache application HTML because the app is auth-gated and changes on
// every deploy — stale cache would break payments / dashboard.

const VERSION = "v1";
const STATIC_CACHE = `mxh-static-${VERSION}`;

// Pre-cache items the offline page references. Keep this short — anything
// listed here blocks `install` until it downloads.
const PRECACHE = ["/logo.png", "/logo.webp"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("mxh-static-") && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Same-origin static assets: serve cache-first, fall through to network,
  // and update the cache for next time. Covers /logo*, /demo/*, and any
  // build asset under /_next/static/.
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname === "/logo.png" ||
      url.pathname === "/logo.webp")
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          })
      )
    );
    return;
  }

  // Everything else (HTML pages, API routes): pass through. The app is
  // auth-gated and we never want a stale dashboard or stale payment page.
});
