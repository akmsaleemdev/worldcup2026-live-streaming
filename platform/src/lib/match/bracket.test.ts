import { describe, it, expect } from "vitest";
import {
  assembleBracket,
  KNOCKOUT_STAGE_ORDER,
  type BracketMatch,
  type KnockoutStage,
} from "./bracket";

// Unit tests for knockout bracket assembly (task 5.9).
//
// _Validates: Requirements 3.4_
//
// These example/edge-case tests pin down the documented contract of
// `assembleBracket`:
//   - rounds are emitted in canonical order (R32 -> R16 -> QF -> SF -> Final,
//     with Third place last);
//   - input order is preserved within each round;
//   - empty/missing rounds are omitted (not rendered as empty placeholders);
//   - unrecognized stages are ignored;
//   - the input array and its elements are never mutated.

// Build a match with the given stage and an id derived from it for assertions.
function match(stage: KnockoutStage, suffix = ""): BracketMatch {
  return { id: `${stage}${suffix}`, stage };
}

describe("assembleBracket", () => {
  it("assembles all knockout stages in canonical order", () => {
    // Deliberately provide the stages out of order to prove the function sorts
    // them into the canonical progression rather than echoing input order.
    const matches: BracketMatch[] = [
      match("FINAL"),
      match("THIRD_PLACE"),
      match("SEMI_FINAL"),
      match("QUARTER_FINAL"),
      match("ROUND_OF_16"),
      match("ROUND_OF_32"),
    ];

    const rounds = assembleBracket(matches);

    expect(rounds.map((r) => r.stage)).toEqual([
      "ROUND_OF_32",
      "ROUND_OF_16",
      "QUARTER_FINAL",
      "SEMI_FINAL",
      "FINAL",
      "THIRD_PLACE",
    ]);
    // Each emitted round carries exactly the one match for that stage.
    for (const round of rounds) {
      expect(round.matches).toHaveLength(1);
      expect(round.matches[0]?.stage).toBe(round.stage);
    }
  });

  it("emits rounds following KNOCKOUT_STAGE_ORDER exactly when every stage is present", () => {
    const matches = KNOCKOUT_STAGE_ORDER.map((stage) => match(stage));

    const rounds = assembleBracket(matches);

    expect(rounds.map((r) => r.stage)).toEqual([...KNOCKOUT_STAGE_ORDER]);
  });

  it("preserves input order within a round", () => {
    const matches: BracketMatch[] = [
      match("ROUND_OF_16", "-a"),
      match("ROUND_OF_16", "-b"),
      match("ROUND_OF_16", "-c"),
    ];

    const rounds = assembleBracket(matches);

    expect(rounds).toHaveLength(1);
    expect(rounds[0]?.matches.map((m) => m.id)).toEqual([
      "ROUND_OF_16-a",
      "ROUND_OF_16-b",
      "ROUND_OF_16-c",
    ]);
  });

  it("omits missing rounds and keeps the present ones in canonical order", () => {
    // A tournament seeded only up to the quarter-finals: R32, QF, Final.
    const matches: BracketMatch[] = [
      match("FINAL"),
      match("ROUND_OF_32"),
      match("QUARTER_FINAL"),
    ];

    const rounds = assembleBracket(matches);

    expect(rounds.map((r) => r.stage)).toEqual([
      "ROUND_OF_32",
      "QUARTER_FINAL",
      "FINAL",
    ]);
  });

  it("returns an empty array for no matches", () => {
    expect(assembleBracket([])).toEqual([]);
  });

  it("groups multiple matches per partial round while skipping absent rounds", () => {
    const matches: BracketMatch[] = [
      match("ROUND_OF_32", "-1"),
      match("ROUND_OF_32", "-2"),
      match("SEMI_FINAL", "-1"),
      match("SEMI_FINAL", "-2"),
    ];

    const rounds = assembleBracket(matches);

    // R16, QF, Final, Third place are absent and must be omitted entirely.
    expect(rounds.map((r) => r.stage)).toEqual(["ROUND_OF_32", "SEMI_FINAL"]);
    expect(rounds[0]?.matches.map((m) => m.id)).toEqual([
      "ROUND_OF_32-1",
      "ROUND_OF_32-2",
    ]);
    expect(rounds[1]?.matches.map((m) => m.id)).toEqual([
      "SEMI_FINAL-1",
      "SEMI_FINAL-2",
    ]);
  });

  it("ignores matches with an unrecognized stage (e.g. group-stage rows)", () => {
    const matches = [
      { id: "group-1", stage: "GROUP_STAGE" },
      { id: "final-1", stage: "FINAL" },
      { id: "unknown-1", stage: "" },
    ];

    const rounds = assembleBracket(matches);

    expect(rounds).toHaveLength(1);
    expect(rounds[0]?.stage).toBe("FINAL");
    expect(rounds[0]?.matches.map((m) => m.id)).toEqual(["final-1"]);
  });

  it("works with richer match types via the generic constraint", () => {
    // Callers may pass full match rows; extra fields are preserved untouched.
    const matches = [
      { id: "f1", stage: "FINAL", homeScore: 2, awayScore: 1 },
      { id: "r1", stage: "ROUND_OF_32", homeScore: 0, awayScore: 0 },
    ];

    const rounds = assembleBracket(matches);

    expect(rounds.map((r) => r.stage)).toEqual(["ROUND_OF_32", "FINAL"]);
    expect(rounds[1]?.matches[0]).toEqual({
      id: "f1",
      stage: "FINAL",
      homeScore: 2,
      awayScore: 1,
    });
  });

  it("does not mutate the input array or its elements", () => {
    const original: BracketMatch[] = [
      match("FINAL"),
      match("ROUND_OF_32"),
      match("SEMI_FINAL"),
    ];
    const snapshot = original.map((m) => ({ ...m }));

    assembleBracket(original);

    expect(original).toHaveLength(3);
    expect(original).toEqual(snapshot);
  });
});
