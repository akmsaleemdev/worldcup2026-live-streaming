/**
 * Knockout bracket assembly (pure, no IO).
 *
 * Implements Requirement 3.4: the Match Center renders all knockout rounds
 * (R32, R16, QF, SF, Final, Third place) from the `KnockoutRound`/`Match`
 * data. This module groups a flat list of knockout matches into rounds and
 * orders those rounds canonically so the UI can render the bracket
 * top-to-bottom without any further sorting logic.
 *
 * The function is intentionally self-contained and free of side effects so it
 * can be unit- and property-tested in isolation (the unit test is task 5.9):
 *   - every output match comes from the input (no fabrication);
 *   - input order is preserved within each round;
 *   - the input array and its elements are never mutated;
 *   - rounds appear in canonical order and only non-empty rounds are emitted.
 */

/**
 * Knockout stage identifiers, mirroring the Prisma `KnockoutStage` enum.
 *
 * Kept as a local string-literal union (rather than importing the generated
 * Prisma type) so this module stays pure and dependency-free for testing.
 */
export type KnockoutStage =
  | "ROUND_OF_32"
  | "ROUND_OF_16"
  | "QUARTER_FINAL"
  | "SEMI_FINAL"
  | "FINAL"
  | "THIRD_PLACE";

/**
 * Canonical order in which knockout rounds are presented. Earlier rounds come
 * first; the third-place playoff is listed last as it sits outside the main
 * progression. This is the single source of truth for round ordering.
 */
export const KNOCKOUT_STAGE_ORDER: readonly KnockoutStage[] = [
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "FINAL",
  "THIRD_PLACE",
] as const;

/**
 * Minimal shape required to assemble a bracket: anything carrying a `stage`
 * string. A concrete `BracketMatch` is provided for convenience, but
 * `assembleBracket` works with any richer match type via its generic
 * constraint, so callers can pass full Prisma `Match` rows directly.
 */
export interface BracketMatch {
  id: string;
  stage: KnockoutStage;
}

/** A single round of the bracket: its stage plus the matches in that round. */
export interface BracketRound<T> {
  stage: KnockoutStage;
  matches: T[];
}

/**
 * Assemble knockout matches into ordered bracket rounds.
 *
 * Matches are grouped by their `stage` and emitted in `KNOCKOUT_STAGE_ORDER`.
 * Within a round, the original input order is preserved. Matches whose `stage`
 * is not a recognised `KnockoutStage` (e.g. group-stage rows) are ignored, so
 * a mixed match list can be passed safely.
 *
 * Missing/partial rounds are handled by **omitting empty rounds**: only stages
 * that have at least one match appear in the result. This keeps the output
 * minimal and lets the UI render whatever rounds currently exist (a tournament
 * mid-progression, or one seeded only up to the quarter-finals) without empty
 * placeholders. The relative ordering of the emitted rounds always follows the
 * canonical order.
 *
 * The input array and its elements are never mutated.
 */
export function assembleBracket<T extends { stage: string }>(
  matches: T[],
): BracketRound<T>[] {
  const byStage = new Map<KnockoutStage, T[]>();

  for (const match of matches) {
    const stage = match.stage as KnockoutStage;
    if (!KNOCKOUT_STAGE_ORDER.includes(stage)) {
      continue;
    }
    let round = byStage.get(stage);
    if (!round) {
      round = [];
      byStage.set(stage, round);
    }
    round.push(match);
  }

  const rounds: BracketRound<T>[] = [];
  for (const stage of KNOCKOUT_STAGE_ORDER) {
    const stageMatches = byStage.get(stage);
    if (stageMatches && stageMatches.length > 0) {
      rounds.push({ stage, matches: stageMatches });
    }
  }

  return rounds;
}
