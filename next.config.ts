import type { NextConfig } from "next";

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
};

export default nextConfig;
