import type { MetadataRoute } from "next";
import { listPosts } from "./blog/posts";

const BASE = "https://medexamhub.org";

// Public surface area. Anything auth-gated (/account, /admin, /exam, /dashboard,
// /review, /notes, /tutor, etc.) is deliberately excluded — Google can't crawl
// it without logging in and we don't want it competing for the brand keywords.
//
// Tier-1 entries (priority 1.0): commercial intent — landing, pricing, plans.
// Tier-2 (0.8): top-of-funnel discovery — library, courses, specialties.
// Tier-3 (0.6): trust / legal — about, contact, refund, privacy, terms.
const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/plans", changeFrequency: "weekly", priority: 1.0 },
  { path: "/library", changeFrequency: "daily", priority: 0.9 },
  { path: "/courses", changeFrequency: "weekly", priority: 0.8 },
  { path: "/research", changeFrequency: "weekly", priority: 0.7 },
  { path: "/community", changeFrequency: "daily", priority: 0.7 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
  { path: "/qotd", changeFrequency: "daily", priority: 0.8 },
  { path: "/about", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.4 },
  { path: "/refund", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/disclaimer", changeFrequency: "yearly", priority: 0.3 },
];

// Specialty landing pages — added separately so adding a new specialty is
// just an entry here, not a code change in two places.
const SPECIALTIES = [
  "cardiology",
  "pediatrics",
  "surgery",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  for (const s of SPECIALTIES) {
    entries.push({
      url: `${BASE}/specialty/${s}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    });
  }

  // Blog posts — pull from the registry so adding a post in posts.ts
  // immediately surfaces in the sitemap on next build.
  for (const post of listPosts()) {
    entries.push({
      url: `${BASE}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return entries;
}
