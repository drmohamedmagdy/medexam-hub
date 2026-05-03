import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // pdf-parse uses CommonJS internals + accesses test fixtures during evaluation
  // in dev. Keep it as an external server module so Webpack/Turbopack don't try
  // to traverse its internals.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
