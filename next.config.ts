import type { NextConfig } from "next";

// Defense-in-depth headers applied to every response. Even though
// React auto-escapes and our SVG generators run user input through
// escapeXml(), a CSP cuts off exfiltration paths if a stored XSS ever
// slipped through, and frame-ancestors blocks clickjacking. Inline
// scripts/styles stay allowed because Next.js's hydration script and
// Tailwind's runtime need them; dropping to nonces is a future hardening
// step.
const csp = [
  "default-src 'self'",
  // Next.js + Vercel telemetry. 'unsafe-eval' is needed by React in
  // some development paths and by a few Next.js runtime helpers.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Permissive img-src because we surface Vercel Blob, OAuth avatars,
  // course thumbnails, plus exam-imported images. data:/blob: cover
  // upload previews.
  "img-src 'self' data: blob: https:",
  // Same idea for media — videos live on Vercel Blob.
  "media-src 'self' blob: https://*.public.blob.vercel-storage.com",
  // SSE + fetches. Self covers our APIs; explicit Vercel hosts cover
  // analytics + Blob uploads.
  // - *.public.blob.vercel-storage.com: where finished blobs are served
  //   from and where simple (<5 MB) PUTs go.
  // - vercel.com + blob.vercel-storage.com: the @vercel/blob client SDK
  //   routes its multipart-upload API calls through these origins. Without
  //   them in the allowlist, browser-side uploads stall at 0% with a CSP
  //   "Refused to connect" error in the console.
  "connect-src 'self' https://vitals.vercel-insights.com https://*.public.blob.vercel-storage.com https://blob.vercel-storage.com https://vercel.com https://va.vercel-scripts.com",
  // No one is allowed to embed us — kills classic clickjacking attacks.
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser APIs we never use — drops the attack surface even
  // if a sub-resource tries to invoke them.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Belt-and-suspenders with Vercel's HSTS — explicit so nothing is
  // ever served over plain HTTP if the platform changes.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Vercel Hobby caps serverless function bodies at 4.5 MB at the edge
      // regardless of this setting. Raising it doesn't help unless on Pro.
      // Migrate to Vercel Blob client-upload for files larger than 4 MB.
      bodySizeLimit: "4mb",
    },
  },
  // pdf-parse uses CommonJS internals + accesses test fixtures during evaluation
  // in dev. Keep it as an external server module so Webpack/Turbopack don't try
  // to traverse its internals.
  // @resvg/resvg-js ships native .node bindings that Turbopack refuses to
  // place in ESM chunks ("non-ecmascript placeable asset") — externalising
  // it tells Next to require() it at runtime instead.
  serverExternalPackages: ["pdf-parse", "@resvg/resvg-js"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
