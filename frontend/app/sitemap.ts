import type { MetadataRoute } from "next";
import { listGames, listGenres } from "@/lib/api";
import { SITE_URL } from "@/lib/site";
import { posts } from "@/content/blog";

/**
 * Dynamic sitemap. Structure:
 *   - top-level static routes
 *   - genre landing pages (40 or so — long-tail SEO magnets)
 *   - top 1000 games (each with a "similar to X" companion route)
 *
 * Anything past ~1500 URLs gets ignored by Google, so we cap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/chat`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/games`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/genres`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...posts.map(p => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: new Date(p.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  const routes: MetadataRoute.Sitemap = [...staticRoutes];

  try {
    const { genres } = await listGenres();
    for (const g of genres.slice(0, 40)) {
      routes.push({
        url: `${SITE_URL}/genres/${encodeURIComponent(g.slug)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {}

  // Only include top 500 games in the sitemap to avoid the "thin content" trap
  // that hits sites with 50k+ auto-generated low-signal pages. The long-tail
  // pages still exist and are crawlable via internal links (similar-games grids,
  // genre pages), they just aren't promoted to Google's crawler.
  try {
    const { games } = await listGames(500, 0);
    for (const g of games) {
      routes.push({
        url: `${SITE_URL}/games/${g.slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
      routes.push({
        url: `${SITE_URL}/games/${g.slug}/similar`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch {}

  return routes;
}
