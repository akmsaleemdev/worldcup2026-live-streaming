/**
 * The six fixed article categories (Req 11.2).
 *
 * The Prisma schema relates `Article` to a `Category` model (many-to-many)
 * rather than storing the `ArticleCategory` enum directly. To bridge the fixed
 * editorial taxonomy required by Req 11.2 with that relational model, each of
 * the six categories has a stable `slug` used to `connectOrCreate` the backing
 * `Category` row, a human `label` for the UI, and an `enumValue` mirroring the
 * Prisma `ArticleCategory` enum for traceability.
 *
 * This module is pure data shared by the Server Actions and the admin editor
 * so both agree on the canonical category set, slugs, and labels.
 */

/** A single fixed article category definition. */
export interface ArticleCategoryDef {
  /** Mirrors the Prisma `ArticleCategory` enum member. */
  enumValue:
    | "BREAKING_NEWS"
    | "MATCH_REPORTS"
    | "TEAM_NEWS"
    | "INJURY_REPORTS"
    | "TACTICAL_ANALYSIS"
    | "PRESS_CONFERENCES";
  /** Stable URL-safe slug; the unique key for the backing `Category` row. */
  slug: string;
  /** Human-readable display label. */
  label: string;
}

/** The canonical, ordered set of the six supported article categories. */
export const ARTICLE_CATEGORIES: readonly ArticleCategoryDef[] = [
  { enumValue: "BREAKING_NEWS", slug: "breaking-news", label: "Breaking News" },
  { enumValue: "MATCH_REPORTS", slug: "match-reports", label: "Match Reports" },
  { enumValue: "TEAM_NEWS", slug: "team-news", label: "Team News" },
  { enumValue: "INJURY_REPORTS", slug: "injury-reports", label: "Injury Reports" },
  {
    enumValue: "TACTICAL_ANALYSIS",
    slug: "tactical-analysis",
    label: "Tactical Analysis",
  },
  {
    enumValue: "PRESS_CONFERENCES",
    slug: "press-conferences",
    label: "Press Conferences",
  },
];

/** The set of valid category slugs, for fast membership checks. */
export const ARTICLE_CATEGORY_SLUGS: readonly string[] = ARTICLE_CATEGORIES.map(
  (c) => c.slug,
);

/** Look up a category definition by its slug, or `undefined` if unknown. */
export function categoryBySlug(slug: string): ArticleCategoryDef | undefined {
  return ARTICLE_CATEGORIES.find((c) => c.slug === slug);
}
