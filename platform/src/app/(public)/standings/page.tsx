import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { StandingsTable } from "@/components/match-center/StandingsTable";
import type { CompletedMatch } from "@/lib/match/standings";
import { standingsMetadata } from "@/lib/seo/site";

/**
 * Group standings page (Req 3.3).
 *
 * Server component. Loads groups with their teams and the completed matches
 * between members of each group, then renders a `StandingsTable` per group.
 * Standings are derived purely from completed match scores via
 * `computeStandings`.
 */

export const revalidate = 60;

export const metadata: Metadata = standingsMetadata();

async function loadStandingsData() {
  // Resilient read: build environments without a reachable database fall back
  // to empty data so prerendering succeeds; ISR repopulates at runtime.
  try {
    const [groups, completed] = await Promise.all([
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
    ]);
    return { groups, completed };
  } catch (error) {
    console.error("StandingsPage: failed to load standings data", error);
    return { groups: [], completed: [] };
  }
}

export default async function StandingsPage() {
  const { groups, completed } = await loadStandingsData();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-orbitron text-4xl font-black text-foreground-strong">
          Group Standings
        </h1>
        <p className="mt-2 text-foreground/70">
          Tables update as group-stage results are completed.
        </p>
      </header>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-foreground/60">
          Groups have not been drawn yet.
        </p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {groups.map((group) => {
            const teamIds = group.teams.map((team) => team.id);
            const teamIdSet = new Set(teamIds);
            const teamNames = Object.fromEntries(
              group.teams.map((team) => [team.id, team.name]),
            );
            const groupMatches: CompletedMatch[] = completed
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
              }));

            return (
              <StandingsTable
                key={group.id}
                groupName={group.name}
                matches={groupMatches}
                teamIds={teamIds}
                teamNames={teamNames}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
