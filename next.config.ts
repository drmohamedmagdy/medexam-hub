import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Library uploads can include presentations and large PDFs — bumped from
      // 10mb to fit typical lecture decks. Vercel function memory still caps
      // the actual maximum we can process in-memory.
      bodySizeLimit: "30mb",
    },
  },
  // pdf-parse uses CommonJS internals + accesses test fixtures during evaluation
  // in dev. Keep it as an external server module so Webpack/Turbopack don't try
  // to traverse its internals.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
