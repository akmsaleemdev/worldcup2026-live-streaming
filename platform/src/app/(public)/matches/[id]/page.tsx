import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  MatchDetailTabs,
  type MatchTabId,
} from "@/components/match-center/MatchDetailTabs";
import { LiveEvents, type LiveEvent } from "@/components/match-center/LiveEvents";
import { StreamingPlayer } from "@/components/player/StreamingPlayer";
import { JsonLd } from "@/components/seo/JsonLd";
import { matchMetadata, matchSportsEventJsonLd } from "@/lib/seo/site";
import type { ReactNode } from "react";

/**
 * Match detail page (Req 3.2, 3.6).
 *
 * Server component. Loads a single match with its teams and events, renders the
 * streaming player (the StreamingPlayer client island handles playlist
 * resolution and failover), the live events feed, and the tabbed detail
 * interface (Overview, Summary, Lineups, Formations, Venue, Weather, Referee).
 */

export const revalidate = 30;

interface MatchPageProps {
  params: Promise<{ id: string }>;
}

async function loadMatch(id: string) {
  return prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: { select: { id: true, name: true, shortName: true } },
      awayTeam: { select: { id: true, name: true, shortName: true } },
      events: { select: { id: true, minute: true, type: true, description: true } },
    },
  });
}

export async function generateMetadata({
  params,
}: MatchPageProps): Promise<Metadata> {
  const { id } = await params;
  const match = await loadMatch(id);
  if (!match) {
    return { title: "Match not found — KOORAKIT" };
  }
  return matchMetadata({
    id: match.id,
    homeTeamName: match.homeTeam.name,
    awayTeamName: match.awayTeam.name,
    startDate: new Date(match.matchDate).toISOString(),
  });
}

/** Map an internal match status to a schema.org eventStatus IRI, if known. */
function toEventStatus(status: string): string | undefined {
  switch (status) {
    case "SCHEDULED":
    case "UPCOMING":
    case "LIVE":
      return "https://schema.org/EventScheduled";
    case "CANCELLED":
      return "https://schema.org/EventCancelled";
    case "POSTPONED":
      return "https://schema.org/EventPostponed";
    default:
      return undefined;
  }
}

function DefinitionRow({ term, value }: { term: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 py-2 last:border-0">
      <dt className="text-foreground/60">{term}</dt>
      <dd className="text-right font-medium text-foreground-strong">
        {value && value.trim() ? value : "TBD"}
      </dd>
    </div>
  );
}

export default async function MatchDetailPage({ params }: MatchPageProps) {
  const { id } = await params;
  const match = await loadMatch(id);

  if (!match) {
    notFound();
  }

  const isLive = match.status === "LIVE";
  const showScore = isLive || match.status === "COMPLETED";
  const kickoff = new Date(match.matchDate);

  const sportsEvent = matchSportsEventJsonLd({
    id: match.id,
    homeTeamName: match.homeTeam.name,
    awayTeamName: match.awayTeam.name,
    startDate: Number.isNaN(kickoff.getTime())
      ? new Date(0).toISOString()
      : kickoff.toISOString(),
    venue: match.venue ?? match.stadium ?? undefined,
    eventStatus: toEventStatus(match.status),
  });

  const overview: ReactNode = (
    <dl className="max-w-md">
      <DefinitionRow term="Status" value={match.status} />
      <DefinitionRow
        term="Kick-off"
        value={
          Number.isNaN(kickoff.getTime())
            ? "TBD"
            : kickoff.toLocaleString("en-US", {
                dateStyle: "full",
                timeStyle: "short",
              })
        }
      />
      <DefinitionRow term="Stage" value={match.stage} />
      <DefinitionRow term="Stadium" value={match.stadium} />
      <DefinitionRow term="Venue" value={match.venue} />
    </dl>
  );

  const panels: Partial<Record<MatchTabId, ReactNode>> = {
    overview,
    summary: (
      <LiveEvents
        matchId={match.id}
        initialEvents={match.events as LiveEvent[]}
        isLive={isLive}
      />
    ),
    venue: (
      <dl className="max-w-md">
        <DefinitionRow term="Stadium" value={match.stadium} />
        <DefinitionRow term="Venue" value={match.venue} />
      </dl>
    ),
    weather: (
      <dl className="max-w-md">
        <DefinitionRow term="Conditions" value={match.weather} />
      </dl>
    ),
    referee: (
      <dl className="max-w-md">
        <DefinitionRow term="Referee" value={match.referee} />
      </dl>
    ),
  };

  return (
    <div className="space-y-8">
      <JsonLd data={sportsEvent} />
      <header className="text-center">
        {match.stage ? (
          <p className="mb-2 text-sm uppercase tracking-wider text-foreground/60">
            {match.stage}
          </p>
        ) : null}
        <div className="flex items-center justify-center gap-6">
          <span className="font-orbitron text-2xl font-bold text-foreground-strong">
            {match.homeTeam.name}
          </span>
          <span className="font-orbitron text-3xl font-black text-accent tabular-nums">
            {showScore ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}` : "vs"}
          </span>
          <span className="font-orbitron text-2xl font-bold text-foreground-strong">
            {match.awayTeam.name}
          </span>
        </div>
        {isLive ? (
          <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-danger">
            <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
            Live now
          </p>
        ) : null}
      </header>

      {/* Streaming player slot — custom HLS.js player with multi-source failover. */}
      <section aria-label="Match stream">
        <StreamingPlayer matchId={match.id} isLive={isLive} />
      </section>

      <MatchDetailTabs panels={panels} />
    </div>
  );
}
