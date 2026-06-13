import { describe, expect, it } from "vitest";
import { fc } from "../../test/fc";
import { computeStandings, type CompletedMatch } from "./standings";

/** A small pool of team ids so matches actually share teams and accumulate. */
const teamIdArb: fc.Arbitrary<string> = fc.constantFrom(
  "AR",
  "BR",
  "FR",
  "DE",
  "ES",
  "EN",
);

/** A completed match between two (possibly distinct) teams with random scores. */
const matchArb: fc.Arbitrary<CompletedMatch> = fc
  .record({
    homeTeamId: teamIdArb,
    awayTeamId: teamIdArb,
    homeScore: fc.integer({ min: 0, max: 9 }),
    awayScore: fc.integer({ min: 0, max: 9 }),
  })
  // A team cannot play itself; resample the away team until it differs.
  .filter((m) => m.homeTeamId !== m.awayTeamId);

/** Arbitrary set of completed matches, including the empty set. */
const matchesArb: fc.Arbitrary<CompletedMatch[]> = fc.array(matchArb, {
  maxLength: 20,
});

describe("standings arithmetic (Property 4)", () => {
  // Feature: worldcup-2026-platform, Property 4: For any set of completed matches, played == won + drawn + lost, points == 3*won + drawn, and GF/GA equal summed scored/conceded goals.
  // _Validates: Requirements 3.3_
  it("keeps played/points consistent and goals equal to summed scored/conceded", () => {
    fc.assert(
      fc.property(matchesArb, (matches) => {
        const standings = computeStandings(matches);

        for (const standing of standings) {
          // played accounts for exactly the won, drawn and lost fixtures.
          expect(standing.played).toBe(
            standing.won + standing.drawn + standing.lost,
          );

          // Standard league scoring: 3 per win, 1 per draw, 0 per loss.
          expect(standing.points).toBe(3 * standing.won + standing.drawn);

          // Independently sum this team's scored/conceded goals from the raw
          // matches (from whichever side it played) and compare to the row.
          let goalsFor = 0;
          let goalsAgainst = 0;
          for (const match of matches) {
            if (match.homeTeamId === standing.teamId) {
              goalsFor += match.homeScore;
              goalsAgainst += match.awayScore;
            }
            if (match.awayTeamId === standing.teamId) {
              goalsFor += match.awayScore;
              goalsAgainst += match.homeScore;
            }
          }

          expect(standing.goalsFor).toBe(goalsFor);
          expect(standing.goalsAgainst).toBe(goalsAgainst);
        }
      }),
    );
  });
});
