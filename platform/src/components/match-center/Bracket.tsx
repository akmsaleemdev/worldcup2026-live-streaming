import { assembleBracket, type KnockoutStage } from "@/lib/match/bracket";

/**
 * Knockout bracket (Req 3.4).
 *
 * Server component. Assembles a flat list of knockout matches into ordered
 * rounds (R32, R16, QF, SF, Final, Third place) via the pure `assembleBracket`
 * helper and renders each round as a column. Shows an empty state when no
 * knockout matches exist.
 */

export interface BracketTeam {
  id: string;
  name: string;
  shortName?: string | null;
}

export interface BracketMatchInput {
  id: string;
  stage: string;
  homeScore?: number | null;
  awayScore?: number | null;
  homeTeam?: BracketTeam | null;
  awayTeam?: BracketTeam | null;
}

const STAGE_LABELS: Record<KnockoutStage, string> = {
  ROUND_OF_32: "Round of 32",
  ROUND_OF_16: "Round of 16",
  QUARTER_FINAL: "Quarter-Finals",
  SEMI_FINAL: "Semi-Finals",
  FINAL: "Final",
  THIRD_PLACE: "Third Place",
};

function teamLabel(team?: BracketTeam | null): string {
  if (!team) {
    return "TBD";
  }
  return team.shortName || team.name;
}

function BracketTeamLine({
  team,
  score,
}: {
  team?: BracketTeam | null;
  score?: number | null;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-foreground-strong">{teamLabel(team)}</span>
      <span className="font-orbitron font-bold tabular-nums text-accent">
        {score ?? "-"}
      </span>
    </div>
  );
}

export function Bracket({ matches }: { matches: BracketMatchInput[] }) {
  const rounds = assembleBracket(matches);

  if (rounds.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-foreground/60">
        The knockout bracket has not been drawn yet.
      </p>
    );
  }

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {rounds.map((round) => (
        <section
          key={round.stage}
          aria-label={STAGE_LABELS[round.stage]}
          className="min-w-56 flex-1"
        >
          <h3 className="mb-4 font-orbitron text-sm font-bold uppercase tracking-wider text-accent">
            {STAGE_LABELS[round.stage]}
          </h3>
          <ul className="space-y-4">
            {round.matches.map((match) => (
              <li
                key={match.id}
                className="glass space-y-2 rounded-lg border border-white/10 p-3 text-sm"
              >
                <BracketTeamLine team={match.homeTeam} score={match.homeScore} />
                <div className="border-t border-white/5" />
                <BracketTeamLine team={match.awayTeam} score={match.awayScore} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default Bracket;
