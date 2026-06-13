/**
 * Standings computation (pure, no IO).
 *
 * Implements Requirement 3.3: the Match Center displays group standings tables
 * showing played, won, drawn, lost, goals for, goals against, and points per
 * team. This module derives those per-team aggregates purely from a set of
 * completed matches.
 *
 * The function is intentionally self-contained and free of side effects so it
 * can be unit- and property-tested in isolation (Correctness Property 4):
 *   - played          == won + drawn + lost
 *   - points          == 3 * won + drawn
 *   - goalsFor / goalsAgainst equal the summed scored / conceded goals from
 *     each team's perspective across all of its matches.
 *
 * Scoring follows standard football league rules: a win is worth 3 points, a
 * draw 1 point, and a loss 0 points.
 */

/**
 * A completed match with final scores, viewed from the home/away perspective.
 *
 * Scores are expected to be non-negative integers. A match contributes one
 * played fixture to each of its two teams.
 */
export interface CompletedMatch {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
}

/**
 * Aggregated standing row for a single team.
 *
 * Invariants (always hold for the output of `computeStandings`):
 *   - played == won + drawn + lost
 *   - points == 3 * won + drawn
 */
export interface TeamStanding {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

/** Goal difference for a standing (goalsFor - goalsAgainst). */
function goalDifference(standing: TeamStanding): number {
  return standing.goalsFor - standing.goalsAgainst;
}

/**
 * Compute per-team standings from a set of completed matches.
 *
 * For each match, both teams get `played + 1`. The team with the higher score
 * gets `won + 1`, the other `lost + 1`; an equal score gives both `drawn + 1`.
 * `goalsFor` / `goalsAgainst` are summed from each team's perspective, and
 * `points = 3 * won + drawn`.
 *
 * An optional `teamIds` list seeds the result so that teams with no completed
 * matches still appear as zero-filled rows (useful for full group tables). Any
 * team referenced by a match is always included even if not listed.
 *
 * The output is sorted deterministically by the documented tiebreak order
 * (see below). The input array and its elements are never mutated.
 *
 * Tiebreak (sort) order — applied in sequence, each only when the previous is
 * equal:
 *   1. points        — descending  (more points rank higher)
 *   2. goalDifference — descending  (goalsFor - goalsAgainst)
 *   3. goalsFor      — descending  (more goals scored rank higher)
 *   4. teamId        — ascending   (lexicographic, for a fully stable, total
 *                                   ordering across all inputs)
 */
export function computeStandings(
  matches: CompletedMatch[],
  teamIds?: string[],
): TeamStanding[] {
  const standings = new Map<string, TeamStanding>();

  const ensure = (teamId: string): TeamStanding => {
    let standing = standings.get(teamId);
    if (!standing) {
      standing = {
        teamId,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      };
      standings.set(teamId, standing);
    }
    return standing;
  };

  // Seed any explicitly-requested teams so they appear even with no matches.
  if (teamIds) {
    for (const teamId of teamIds) {
      ensure(teamId);
    }
  }

  for (const match of matches) {
    const home = ensure(match.homeTeamId);
    const away = ensure(match.awayTeamId);

    home.played += 1;
    away.played += 1;

    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.won += 1;
      away.lost += 1;
    } else if (match.homeScore < match.awayScore) {
      away.won += 1;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
    }

    home.points = 3 * home.won + home.drawn;
    away.points = 3 * away.won + away.drawn;
  }

  return [...standings.values()].sort(
    (a, b) =>
      b.points - a.points ||
      goalDifference(b) - goalDifference(a) ||
      b.goalsFor - a.goalsFor ||
      (a.teamId < b.teamId ? -1 : a.teamId > b.teamId ? 1 : 0),
  );
}
