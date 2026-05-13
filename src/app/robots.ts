import type { MetadataRoute } from "next";

// Tell crawlers what's public-search-eligible vs auth-gated vs API.
// Vercel serves this at /robots.txt automatically when this file is present.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/account/",   // user-specific dashboards, invoices, settings
          "/admin/",     // operator console
          "/api/",       // backend endpoints; not useful to index
          "/exam/",      // generated per-user; not stable URLs
          "/mock/",      // same — per-user runs
          "/review/",    // spaced-rep cards bound to a user
          "/notes/",     // personal notes
          "/tutor/",     // private chat
          "/payment/",   // post-checkout redirects, not landing surfaces
          "/checkout/",  // requires auth + plan param
          "/dashboard",  // signed-in only
          "/u/",         // public profiles can opt in, but crawl-allow case-by-case
        ],
      },
    ],
    sitemap: "https://medexamhub.org/sitemap.xml",
    host: "https://medexamhub.org",
  };
}
