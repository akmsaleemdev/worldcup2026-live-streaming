import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { MatchList, type MatchListMatch } from "@/components/match-center/MatchList";
import { matchesMetadata } from "@/lib/seo/site";

/**
 * Match Center listing page (Req 3.1).
 *
 * Server component. Loads matches with their teams and renders them grouped
 * into Live / Upcoming / Completed via the `MatchList` component. Revalidates
 * periodically so live/upcoming buckets stay reasonably fresh.
 */

export const revalidate = 30;

export const metadata: Metadata = matchesMetadata();

async function loadMatches() {
  // Resilient read: build environments without a reachable database fall back
  // to an empty list so prerendering succeeds; ISR repopulates at runtime.
  try {
    return await prisma.match.findMany({
      orderBy: { matchDate: "asc" },
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
        awayTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      },
    });
  } catch (error) {
    console.error("MatchesPage: failed to load matches", error);
    return [];
  }
}

export default async function MatchesPage() {
  const matches = await loadMatches();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-orbitron text-4xl font-black text-foreground-strong">
          Match Center
        </h1>
        <p className="mt-2 text-foreground/70">
          Every fixture of the tournament, grouped by status.
        </p>
      </header>
      <MatchList matches={matches as unknown as MatchListMatch[]} />
    </div>
  );
}
