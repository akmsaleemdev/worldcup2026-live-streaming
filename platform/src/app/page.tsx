import type { Metadata } from "next";
import Link from "next/link";
import { PlayCircle, Calendar } from "lucide-react";

import { prisma } from "@/lib/db";
import { homeMetadata } from "@/lib/seo/site";
import { Countdown } from "@/components/home/Countdown";
import { HeroSceneBackground } from "@/components/home/HeroSceneBackground";
import {
  StandingsTable,
} from "@/components/match-center/StandingsTable";
import { Bracket, type BracketMatchInput } from "@/components/match-center/Bracket";
import type { CompletedMatch } from "@/lib/match/standings";

/**
 * Home page (Req 10).
 *
 * Server component. Loads all home-page data through Prisma and renders the
 * KOORAKIT hero plus the five required sections (Live Now, Upcoming Matches,
 * Latest News, Group Tables, Knockout Brackets). The only client boundary is
 * the small `<Countdown>` ticker in the hero.
 *
 * Data loading is wrapped so an empty or unreachable database degrades to
 * graceful empty states rather than crashing the page.
 */

export const revalidate = 30;

export const metadata: Metadata = homeMetadata();

/** Fallback countdown target when no `countdown_target` setting exists. */
const FALLBACK_COUNTDOWN_TARGET = "2026-06-11T00:00:00.000Z";

/** Number of upcoming fixtures and articles surfaced on the home page. */
const UPCOMING_LIMIT = 6;
const NEWS_LIMIT = 3;

interface HomeTeam {
  id: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
}

interface HomeMatch {
  id: string;
  status: string;
  matchDate: Date;
  homeScore: number | null;
  awayScore: number | null;
  stage: string | null;
  homeTeam: HomeTeam;
  awayTeam: HomeTeam;
}

interface HomeArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  createdAt: Date;
}

interface HomeGroup {
  id: string;
  name: string;
  teamIds: string[];
  teamNames: Record<string, string>;
  matches: CompletedMatch[];
}

interface HomeData {
  countdownTarget: string;
  liveMatches: HomeMatch[];
  upcomingMatches: HomeMatch[];
  articles: HomeArticle[];
  groups: HomeGroup[];
  bracketMatches: BracketMatchInput[];
}

const TEAM_SELECT = {
  select: { id: true, name: true, shortName: true, logoUrl: true },
} as const;

const EMPTY_DATA: HomeData = {
  countdownTarget: FALLBACK_COUNTDOWN_TARGET,
  liveMatches: [],
  upcomingMatches: [],
  articles: [],
  groups: [],
  bracketMatches: [],
};

async function loadHomeData(): Promise<HomeData> {
  try {
    const [
      countdownSetting,
      liveMatches,
      upcomingMatches,
      articles,
      groups,
      completed,
      knockout,
    ] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "countdown_target" } }),
      prisma.match.findMany({
        where: { status: "LIVE" },
        orderBy: { matchDate: "asc" },
        include: { homeTeam: TEAM_SELECT, awayTeam: TEAM_SELECT },
      }),
      prisma.match.findMany({
        where: { status: "UPCOMING" },
        orderBy: { matchDate: "asc" },
        take: UPCOMING_LIMIT,
        include: { homeTeam: TEAM_SELECT, awayTeam: TEAM_SELECT },
      }),
      prisma.article.findMany({
        where: { published: true },
        orderBy: { createdAt: "desc" },
        take: NEWS_LIMIT,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          createdAt: true,
        },
      }),
      prisma.group.findMany({
        orderBy: { name: "asc" },
        include: { teams: { select: { id: true, name: true } } },
      }),
      prisma.match.findMany({
        where: { status: "COMPLETED" },
        select: {
          homeTeamId: true,
          awayTeamId: true,
          homeScore: true,
          awayScore: true,
        },
      }),
      prisma.match.findMany({
        where: { knockoutRoundId: { not: null } },
        orderBy: { matchDate: "asc" },
        include: {
          knockoutRound: { select: { stage: true } },
          homeTeam: { select: { id: true, name: true, shortName: true } },
          awayTeam: { select: { id: true, name: true, shortName: true } },
        },
      }),
    ]);

    const homeGroups: HomeGroup[] = groups.map((group) => {
      const teamIds = group.teams.map((team) => team.id);
      const teamIdSet = new Set(teamIds);
      return {
        id: group.id,
        name: group.name,
        teamIds,
        teamNames: Object.fromEntries(
          group.teams.map((team) => [team.id, team.name]),
        ),
        matches: completed
          .filter(
            (match) =>
              teamIdSet.has(match.homeTeamId) &&
              teamIdSet.has(match.awayTeamId),
          )
          .map((match) => ({
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
            homeScore: match.homeScore ?? 0,
            awayScore: match.awayScore ?? 0,
          })),
      };
    });

    const bracketMatches: BracketMatchInput[] = knockout
      .filter((match) => match.knockoutRound)
      .map((match) => ({
        id: match.id,
        stage: match.knockoutRound!.stage,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
      }));

    return {
      countdownTarget: countdownSetting?.value || FALLBACK_COUNTDOWN_TARGET,
      liveMatches: liveMatches as unknown as HomeMatch[],
      upcomingMatches: upcomingMatches as unknown as HomeMatch[],
      articles: articles as HomeArticle[],
      groups: homeGroups,
      bracketMatches,
    };
  } catch {
    // Empty/unreachable DB: render the page with graceful empty states.
    return EMPTY_DATA;
  }
}

function formatKickoff(value: Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date TBD";
  }
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function teamLabel(team: HomeTeam): string {
  return team.shortName || team.name;
}

function HomeMatchCard({ match }: { match: HomeMatch }) {
  const isLive = match.status === "LIVE";
  return (
    <li>
      <Link
        href={`/matches/${match.id}`}
        className="glass block rounded-xl border border-white/10 p-4 transition-colors hover:border-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wider text-foreground/60">
          <span>{match.stage || "Fixture"}</span>
          {isLive ? (
            <span className="inline-flex items-center gap-1 font-semibold text-danger">
              <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
              Live
            </span>
          ) : (
            <time dateTime={new Date(match.matchDate).toISOString()}>
              {formatKickoff(match.matchDate)}
            </time>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate font-medium text-foreground-strong">
              {teamLabel(match.homeTeam)}
            </span>
            {isLive ? (
              <span className="font-orbitron text-lg font-bold tabular-nums text-accent">
                {match.homeScore ?? 0}
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="truncate font-medium text-foreground-strong">
              {teamLabel(match.awayTeam)}
            </span>
            {isLive ? (
              <span className="font-orbitron text-lg font-bold tabular-nums text-accent">
                {match.awayScore ?? 0}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  );
}

function SectionHeading({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 className="font-orbitron text-2xl font-black text-foreground-strong sm:text-3xl">
        {title}
      </h2>
      {href && linkLabel ? (
        <Link
          href={href}
          className="text-sm font-medium text-link transition-colors hover:text-accent"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

export default async function Home() {
  const {
    countdownTarget,
    liveMatches,
    upcomingMatches,
    articles,
    groups,
    bracketMatches,
  } = await loadHomeData();

  // Watch Live navigates to a live match when one exists, else the listing
  // (Req 10.3). No dedicated /live listing route exists yet, so /matches is
  // the canonical fallback destination.
  const watchLiveHref =
    liveMatches.length > 0 ? `/matches/${liveMatches[0].id}` : "/matches";

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col justify-center overflow-hidden border-b border-white/10">
        {/* Presentational 3D background (Req 12.3): lazy-loaded and gated on
            capability/reduced-motion, with a static gradient fallback. */}
        <HeroSceneBackground />
        <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-accent/20 via-transparent to-background opacity-60"></div>
        <div className="pointer-events-none absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1518605368461-1e128222204b?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>

        <div className="container relative z-10 mx-auto max-w-7xl px-6">
          {/* KOORAKIT wordmark */}
          <div className="mb-6 font-orbitron text-2xl font-black uppercase tracking-[0.2em] text-accent">
            KOORAKIT
          </div>

          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
            <span className="h-2 w-2 animate-pulse rounded-full bg-danger"></span>
            World Cup 2026 — The Global Football Festival
          </div>

          <h1 className="mb-6 font-orbitron text-6xl font-black leading-none tracking-tight text-foreground-strong md:text-8xl">
            THE GLOBAL <br />
            <span className="bg-gradient-to-r from-accent to-accent-strong bg-clip-text text-transparent">
              FOOTBALL FESTIVAL.
            </span>
          </h1>

          <p className="mb-8 max-w-2xl font-sans text-lg leading-relaxed text-foreground/70 md:text-xl">
            The ultimate football streaming experience. Catch every goal, every
            tackle, and every moment of the tournament in stunning high
            definition.
          </p>

          {/* Live countdown to kickoff */}
          <div className="mb-10">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-foreground/60">
              Kickoff countdown
            </p>
            <Countdown target={countdownTarget} />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href={watchLiveHref}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-strong px-8 py-4 font-bold text-background transition-transform duration-300 hover:scale-105"
            >
              <PlayCircle className="h-5 w-5" />
              Watch Live
            </Link>
            <Link
              href="/matches"
              className="glass inline-flex items-center justify-center gap-2 rounded-lg px-8 py-4 font-semibold text-foreground transition-colors duration-300 hover:bg-surface"
            >
              <Calendar className="h-5 w-5" />
              Explore Matches
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-6 py-16">
        {/* Live Now */}
        <section aria-labelledby="home-live-now">
          <div id="home-live-now">
            <SectionHeading title="Live Now" href="/matches" linkLabel="All matches" />
          </div>
          {liveMatches.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {liveMatches.map((match) => (
                <HomeMatchCard key={match.id} match={match} />
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-foreground/60">
              No matches are currently live. Check back at kickoff.
            </p>
          )}
        </section>

        {/* Upcoming Matches */}
        <section aria-labelledby="home-upcoming">
          <div id="home-upcoming">
            <SectionHeading title="Upcoming Matches" href="/matches" linkLabel="Full schedule" />
          </div>
          {upcomingMatches.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingMatches.map((match) => (
                <HomeMatchCard key={match.id} match={match} />
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-foreground/60">
              No upcoming matches scheduled yet.
            </p>
          )}
        </section>

        {/* Latest News */}
        <section aria-labelledby="home-news">
          <div id="home-news">
            <SectionHeading title="Latest News" href="/news" linkLabel="All news" />
          </div>
          {articles.length > 0 ? (
            <ul className="grid gap-4 md:grid-cols-3">
              {articles.map((article) => (
                <li key={article.id}>
                  <Link
                    href={`/news/${article.slug}`}
                    className="glass flex h-full flex-col rounded-xl border border-white/10 p-5 transition-colors hover:border-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <time
                      dateTime={new Date(article.createdAt).toISOString()}
                      className="mb-2 text-xs uppercase tracking-wider text-foreground/50"
                    >
                      {formatKickoff(article.createdAt)}
                    </time>
                    <h3 className="mb-2 font-orbitron text-lg font-bold text-foreground-strong">
                      {article.title}
                    </h3>
                    {article.excerpt ? (
                      <p className="text-sm leading-relaxed text-foreground/70">
                        {article.excerpt}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-foreground/60">
              No news published yet. Stay tuned for the latest stories.
            </p>
          )}
        </section>

        {/* Group Tables */}
        <section aria-labelledby="home-groups">
          <div id="home-groups">
            <SectionHeading title="Group Tables" href="/standings" linkLabel="All standings" />
          </div>
          {groups.length > 0 ? (
            <div className="grid gap-8 lg:grid-cols-2">
              {groups.map((group) => (
                <StandingsTable
                  key={group.id}
                  groupName={group.name}
                  matches={group.matches}
                  teamIds={group.teamIds}
                  teamNames={group.teamNames}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-foreground/60">
              Groups have not been drawn yet.
            </p>
          )}
        </section>

        {/* Knockout Brackets */}
        <section aria-labelledby="home-bracket">
          <div id="home-bracket">
            <SectionHeading title="Knockout Brackets" href="/bracket" linkLabel="Full bracket" />
          </div>
          <Bracket matches={bracketMatches} />
        </section>
      </div>
    </main>
  );
}
