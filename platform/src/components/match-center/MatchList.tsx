import Link from "next/link";
import { groupMatches } from "@/lib/match/grouping";

/**
 * Match listing grouped by status (Req 3.1).
 *
 * Server component. Partitions the supplied matches into Live / Upcoming /
 * Completed via the pure `groupMatches` helper and renders each bucket as a
 * labelled section. Each bucket shows an explicit empty state when it has no
 * matches, and the whole list shows an empty state when there are no matches
 * at all.
 */

export interface MatchListTeam {
  id: string;
  name: string;
  shortName?: string | null;
  logoUrl?: string | null;
}

export interface MatchListMatch {
  id: string;
  status: "LIVE" | "UPCOMING" | "COMPLETED" | "POSTPONED" | string;
  matchDate: Date | string;
  homeScore?: number | null;
  awayScore?: number | null;
  stage?: string | null;
  stadium?: string | null;
  venue?: string | null;
  homeTeam: MatchListTeam;
  awayTeam: MatchListTeam;
}

function formatKickoff(value: Date | string): string {
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

function TeamRow({
  team,
  score,
  showScore,
}: {
  team: MatchListTeam;
  score?: number | null;
  showScore: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-medium text-foreground-strong truncate">
        {team.shortName || team.name}
      </span>
      {showScore ? (
        <span className="font-orbitron text-lg font-bold text-accent tabular-nums">
          {score ?? 0}
        </span>
      ) : null}
    </div>
  );
}

function MatchCard({ match }: { match: MatchListMatch }) {
  const isLive = match.status === "LIVE";
  const isCompleted = match.status === "COMPLETED";
  const showScore = isLive || isCompleted;

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
          <TeamRow team={match.homeTeam} score={match.homeScore} showScore={showScore} />
          <TeamRow team={match.awayTeam} score={match.awayScore} showScore={showScore} />
        </div>
      </Link>
    </li>
  );
}

function MatchSection({
  title,
  matches,
  emptyLabel,
}: {
  title: string;
  matches: MatchListMatch[];
  emptyLabel: string;
}) {
  return (
    <section aria-labelledby={`section-${title.toLowerCase()}`}>
      <h2
        id={`section-${title.toLowerCase()}`}
        className="mb-4 font-orbitron text-xl font-bold text-foreground-strong"
      >
        {title}
        <span className="ml-2 text-sm font-normal text-foreground/50">
          ({matches.length})
        </span>
      </h2>
      {matches.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-foreground/60">
          {emptyLabel}
        </p>
      )}
    </section>
  );
}

export function MatchList({ matches }: { matches: MatchListMatch[] }) {
  if (matches.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-foreground/60">
        No matches are scheduled yet. Check back soon.
      </p>
    );
  }

  const { live, upcoming, completed } = groupMatches(matches);

  return (
    <div className="space-y-10">
      <MatchSection
        title="Live"
        matches={live}
        emptyLabel="No matches are currently live."
      />
      <MatchSection
        title="Upcoming"
        matches={upcoming}
        emptyLabel="No upcoming matches scheduled."
      />
      <MatchSection
        title="Completed"
        matches={completed}
        emptyLabel="No completed matches yet."
      />
    </div>
  );
}

export default MatchList;
