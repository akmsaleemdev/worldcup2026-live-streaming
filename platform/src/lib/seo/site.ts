/**
 * Site-level SEO wiring helpers (Requirements 8.1–8.4, 20.3).
 *
 * This module is the thin, reusable bridge between the pure SEO builders
 * (`metadata.ts`, `jsonld.ts`) and the Next.js App Router surfaces that consume
 * them (route `generateMetadata`/`metadata` exports, `app/sitemap.ts`,
 * `app/robots.ts`, and JSON-LD `<script>` emission in layouts/pages).
 *
 * Everything here is pure and IO-free: the only ambient value read is
 * `process.env.NEXT_PUBLIC_SITE_URL` (via the metadata builder), used solely as
 * the default base URL. Concurrent work on the Match Center / News pages can
 * import the route metadata helpers and the entity JSON-LD helpers below
 * without taking a dependency on any other page module.
 */

import type { Metadata } from "next";

import {
  buildMetadata,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  toAbsoluteHttpsUrl,
} from "./metadata";
import {
  articleJsonLd,
  athleteJsonLd,
  faqPageJsonLd,
  organizationJsonLd,
  sportsEventJsonLd,
  sportsTeamEntityJsonLd,
  type ArticleJsonLd,
  type AthleteJsonLd,
  type FaqInput,
  type FaqPageJsonLd,
  type OrganizationJsonLd,
  type SportsEventJsonLd,
  type SportsTeamEntityJsonLd,
} from "./jsonld";

/** Competition name surfaced in entity-relationship structured data. */
export const COMPETITION_NAME = "World Cup 2026" as const;

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------

/**
 * The absolute HTTPS site origin (no trailing slash), e.g.
 * `https://koorakit.com`. Honors `NEXT_PUBLIC_SITE_URL` and falls back to the
 * KOORAKIT default. Used to build canonical/sitemap/robots URLs.
 */
export function getSiteBaseUrl(): string {
  return toAbsoluteHttpsUrl(undefined, undefined);
}

/** Build an absolute HTTPS URL for a site-relative path. */
export function absoluteUrl(path: string): string {
  return toAbsoluteHttpsUrl(undefined, path);
}

// ---------------------------------------------------------------------------
// Organization JSON-LD (root layout — Requirement 8.4)
// ---------------------------------------------------------------------------

/**
 * Social/profile URLs surfaced as schema.org `sameAs` on the Organization
 * node. Empty by default; populate as official KOORAKIT profiles come online.
 */
export const ORGANIZATION_SAME_AS: readonly string[] = [];

/**
 * Build the site-wide `Organization` JSON-LD object emitted once in the root
 * layout. Pure: derives every field from the resolved base URL and brand
 * constants.
 */
export function siteOrganizationJsonLd(): OrganizationJsonLd {
  const url = getSiteBaseUrl();
  return organizationJsonLd({
    name: SITE_NAME,
    url,
    logo: absoluteUrl(DEFAULT_OG_IMAGE),
    description: DEFAULT_DESCRIPTION,
    sameAs:
      ORGANIZATION_SAME_AS.length > 0 ? [...ORGANIZATION_SAME_AS] : undefined,
  });
}

// ---------------------------------------------------------------------------
// Public route metadata helpers (Requirement 8.1, 20.3)
// ---------------------------------------------------------------------------
//
// Each helper returns a complete `Metadata` (non-empty title/description,
// OpenGraph, Twitter, and an absolute HTTPS canonical URL) for a public route.
// Pages call these from their `export const metadata` / `generateMetadata`.

/** Metadata for the home page (`/`). */
export function homeMetadata(): Metadata {
  return buildMetadata({ path: "/", type: "page" });
}

/** Metadata for the matches list page (`/matches`). */
export function matchesMetadata(): Metadata {
  return buildMetadata({
    path: "/matches",
    type: "page",
    title: "Matches",
    description:
      "Live, upcoming, and completed World Cup 2026 matches with scores, schedules, and streams on KOORAKIT.",
  });
}

/** Metadata for the standings page (`/standings`). */
export function standingsMetadata(): Metadata {
  return buildMetadata({
    path: "/standings",
    type: "page",
    title: "Standings",
    description:
      "Live World Cup 2026 group standings with points, goal difference, and qualification scenarios on KOORAKIT.",
  });
}

/** Metadata for the knockout bracket page (`/bracket`). */
export function bracketMetadata(): Metadata {
  return buildMetadata({
    path: "/bracket",
    type: "page",
    title: "Knockout Bracket",
    description:
      "Follow the World Cup 2026 knockout bracket from the Round of 32 through to the Final on KOORAKIT.",
  });
}

/** Metadata for the news list page (`/news`). */
export function newsMetadata(): Metadata {
  return buildMetadata({
    path: "/news",
    type: "page",
    title: "News",
    description:
      "Breaking news, match reports, team news, and tactical analysis for World Cup 2026 on KOORAKIT.",
  });
}

// ---------------------------------------------------------------------------
// Detail-page metadata helpers (Requirement 8.1, 20.3)
// ---------------------------------------------------------------------------

/** Minimal shape needed to build metadata + structured data for a match. */
export interface MatchSeoRecord {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  /** ISO-8601 kickoff datetime. */
  startDate: string;
  /** ISO-8601 end datetime (optional). */
  endDate?: string;
  venue?: string;
  /** schema.org eventStatus IRI, e.g. ".../EventScheduled". */
  eventStatus?: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
}

/** Build metadata for a match detail page (`/matches/[id]`). */
export function matchMetadata(match: MatchSeoRecord): Metadata {
  const fixture = `${match.homeTeamName} vs ${match.awayTeamName}`;
  return buildMetadata({
    path: `/matches/${match.id}`,
    type: "match",
    title: fixture,
    description: `Watch ${fixture} live and follow the lineups, scores, and key moments for this World Cup 2026 match on KOORAKIT.`,
  });
}

/**
 * Build `SportsEvent` JSON-LD for a match detail page (Requirement 8.4).
 *
 * Wire this from `app/matches/[id]/page.tsx` once that route exists, e.g.:
 *
 * ```tsx
 * import { JsonLd } from "@/components/seo/JsonLd";
 * import { matchSportsEventJsonLd } from "@/lib/seo/site";
 * // ...inside the page render:
 * <JsonLd data={matchSportsEventJsonLd(match)} />
 * ```
 */
export function matchSportsEventJsonLd(
  match: MatchSeoRecord,
): SportsEventJsonLd {
  return sportsEventJsonLd({
    name: `${match.homeTeamName} vs ${match.awayTeamName}`,
    startDate: match.startDate,
    endDate: match.endDate,
    location: match.venue,
    url: absoluteUrl(`/matches/${match.id}`),
    eventStatus: match.eventStatus,
    homeTeam: { name: match.homeTeamName, logo: match.homeTeamLogo },
    awayTeam: { name: match.awayTeamName, logo: match.awayTeamLogo },
  });
}

/** Minimal shape needed to build metadata for a player profile. */
export interface PlayerSeoRecord {
  id: string;
  name: string;
  teamName?: string | null;
  /** The player's team id, used to link the athlete to their team page. */
  teamId?: string | null;
}

/** Build metadata for a player profile page (`/players/[id]`). */
export function playerMetadata(player: PlayerSeoRecord): Metadata {
  const team = player.teamName ? ` (${player.teamName})` : "";
  return buildMetadata({
    path: `/players/${player.id}`,
    type: "page",
    title: player.name,
    description: `${player.name}${team} World Cup 2026 statistics: goals, assists, and disciplinary record on KOORAKIT.`,
  });
}

/** Minimal shape needed to build metadata + structured data for an article. */
export interface ArticleSeoRecord {
  slug: string;
  title: string;
  excerpt?: string;
  /** ISO-8601 publication datetime. */
  datePublished: string;
  /** ISO-8601 last-modified datetime (optional). */
  dateModified?: string;
  author?: string;
  image?: string;
}

/** Build metadata for an article detail page (`/news/[slug]`). */
export function articleMetadata(article: ArticleSeoRecord): Metadata {
  return buildMetadata({
    path: `/news/${article.slug}`,
    type: "article",
    title: article.title,
    description: article.excerpt,
    image: article.image,
  });
}

/**
 * Build `Article` (NewsArticle) JSON-LD for an article detail page
 * (Requirement 8.4).
 *
 * Wire this from `app/news/[slug]/page.tsx` once that route exists, e.g.:
 *
 * ```tsx
 * import { JsonLd } from "@/components/seo/JsonLd";
 * import { articleNewsJsonLd } from "@/lib/seo/site";
 * // ...inside the page render:
 * <JsonLd data={articleNewsJsonLd(article)} />
 * ```
 */
export function articleNewsJsonLd(article: ArticleSeoRecord): ArticleJsonLd {
  const url = getSiteBaseUrl();
  return articleJsonLd({
    headline: article.title,
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    author: article.author,
    image: article.image ? absoluteUrl(article.image) : undefined,
    description: article.excerpt,
    url: absoluteUrl(`/news/${article.slug}`),
    isNewsArticle: true,
    publisher: {
      name: SITE_NAME,
      url,
      logo: absoluteUrl(DEFAULT_OG_IMAGE),
    },
  });
}

// ---------------------------------------------------------------------------
// Entity-relationship JSON-LD (AEO — Requirement 13.3)
// ---------------------------------------------------------------------------

/**
 * Build athlete `Person` JSON-LD for a player profile page (`/players/[id]`),
 * expressing the player→team relationship via schema.org `memberOf`.
 */
export function playerAthleteJsonLd(player: PlayerSeoRecord): AthleteJsonLd {
  return athleteJsonLd({
    name: player.name,
    url: absoluteUrl(`/players/${player.id}`),
    team: player.teamName
      ? { name: player.teamName, url: absoluteUrl(`/teams/${player.teamId ?? ""}`) }
      : undefined,
  });
}

/** Minimal shape needed to build metadata + structured data for a team. */
export interface TeamSeoRecord {
  id: string;
  name: string;
  logo?: string | null;
  coach?: string | null;
  /** Roster members, used to express the team→players relationship. */
  players?: { id: string; name: string }[];
}

/** Build metadata for a team detail page (`/teams/[id]`). */
export function teamMetadata(team: TeamSeoRecord): Metadata {
  return buildMetadata({
    path: `/teams/${team.id}`,
    type: "page",
    title: team.name,
    description: `${team.name} World Cup 2026 squad, fixtures, and player statistics on KOORAKIT.`,
    image: team.logo ?? undefined,
  });
}

/**
 * Build `SportsTeam` entity JSON-LD for a team detail page (`/teams/[id]`),
 * expressing the team→roster (`athlete`) and team→competition (`memberOf`)
 * relationships.
 */
export function teamEntityJsonLd(team: TeamSeoRecord): SportsTeamEntityJsonLd {
  return sportsTeamEntityJsonLd({
    name: team.name,
    url: absoluteUrl(`/teams/${team.id}`),
    logo: team.logo ? absoluteUrl(team.logo) : undefined,
    coach: team.coach ?? undefined,
    athletes: (team.players ?? []).map((p) => ({
      name: p.name,
      url: absoluteUrl(`/players/${p.id}`),
    })),
    memberOf: COMPETITION_NAME,
  });
}

// ---------------------------------------------------------------------------
// FAQ JSON-LD (AEO — Requirement 13.2)
// ---------------------------------------------------------------------------

/**
 * Build `FAQPage` JSON-LD from published FAQ entries for the public FAQ surface
 * (`/faq`). Each entry contributes one `Question`/`Answer` pair in input order.
 */
export function faqJsonLd(faqs: FaqInput[]): FaqPageJsonLd {
  return faqPageJsonLd(faqs);
}
