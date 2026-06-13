/**
 * XML sitemap for public pages (Requirement 8.2).
 *
 * Emits the static public routes (home, matches, standings, bracket, news) and
 * augments them with dynamic entries for individual matches and published
 * articles queried from the database. Database access is fully defensive: if a
 * query fails or returns nothing (e.g. an unseeded or unavailable database),
 * the sitemap still resolves with the static entries.
 *
 * Match Center / News detail routes may be created concurrently; this handler
 * never imports those page modules — it derives URLs from Prisma records and
 * the shared base-URL helper only.
 */

import type { MetadataRoute } from "next";

import { prisma } from "@/lib/db";
import { absoluteUrl, getSiteBaseUrl } from "@/lib/seo/site";

// Always render fresh so newly published matches/articles appear promptly.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteBaseUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/matches"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/standings"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/bracket"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/news"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  let dynamicEntries: MetadataRoute.Sitemap = [];

  try {
    const [matches, articles] = await Promise.all([
      prisma.match.findMany({
        select: { id: true, updatedAt: true },
      }),
      prisma.article.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const matchEntries: MetadataRoute.Sitemap = matches.map((match) => ({
      url: absoluteUrl(`/matches/${match.id}`),
      lastModified: match.updatedAt,
      changeFrequency: "hourly",
      priority: 0.7,
    }));

    const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
      url: absoluteUrl(`/news/${article.slug}`),
      lastModified: article.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    dynamicEntries = [...matchEntries, ...articleEntries];
  } catch {
    // Database unavailable/unseeded — fall back to the static entries only.
    dynamicEntries = [];
  }

  return [...staticEntries, ...dynamicEntries];
}
