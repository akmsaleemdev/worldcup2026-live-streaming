import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import {
  Bracket,
  type BracketMatchInput,
} from "@/components/match-center/Bracket";
import { bracketMetadata } from "@/lib/seo/site";

/**
 * Knockout bracket page (Req 3.4).
 *
 * Server component. Loads matches assigned to a knockout round, maps each to
 * its canonical `KnockoutStage` (via the related `KnockoutRound`), and renders
 * the ordered bracket via the `Bracket` component / pure `assembleBracket`.
 */

export const revalidate = 60;

export const metadata: Metadata = bracketMetadata();

async function loadKnockoutMatches() {
  // Resilient read: during a build with no reachable database (e.g. CI/Docker
  // image build without DATABASE_URL connectivity), fall back to an empty set
  // so prerendering succeeds. At runtime ISR revalidation repopulates the page.
  try {
    return await prisma.match.findMany({
      where: { knockoutRoundId: { not: null } },
      orderBy: { matchDate: "asc" },
      include: {
        knockoutRound: { select: { stage: true } },
        homeTeam: { select: { id: true, name: true, shortName: true } },
        awayTeam: { select: { id: true, name: true, shortName: true } },
      },
    });
  } catch (error) {
    console.error("BracketPage: failed to load knockout matches", error);
    return [];
  }
}

export default async function BracketPage() {
  const matches = await loadKnockoutMatches();

  const bracketMatches: BracketMatchInput[] = matches
    .filter((match) => match.knockoutRound)
    .map((match) => ({
      id: match.id,
      stage: match.knockoutRound!.stage,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
    }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-orbitron text-4xl font-black text-foreground-strong">
          Knockout Bracket
        </h1>
        <p className="mt-2 text-foreground/70">
          From the Round of 32 to the Final.
        </p>
      </header>
      <Bracket matches={bracketMatches} />
    </div>
  );
}
