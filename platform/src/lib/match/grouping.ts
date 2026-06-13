/**
 * Match grouping (pure, no IO).
 *
 * Implements Requirement 3.1: the Match Center lists matches grouped by status
 * as Live, Upcoming, and Completed. This module partitions a set of matches
 * into those three buckets purely from each match's `status`.
 *
 * Status mapping (accepts the Prisma `MatchStatus` enum values
 * `UPCOMING | LIVE | COMPLETED | POSTPONED`, plus any other string):
 *   - "LIVE"       -> live
 *   - "UPCOMING"   -> upcoming
 *   - "COMPLETED"  -> completed
 *   - "POSTPONED"  -> upcoming  (a postponed match has not been played yet, so
 *                                it belongs with the not-yet-played fixtures)
 *   - any other    -> upcoming  (safe default so no match is ever dropped)
 *
 * Mapping POSTPONED — and any unrecognized status — to `upcoming` guarantees a
 * COMPLETE partition: every input match lands in exactly one of the three
 * buckets, so the multiset union of the buckets always equals the input
 * (Property 3). Input order is preserved within each bucket, and the input
 * array is never mutated.
 */

/**
 * A minimally-typed match that can be grouped. Accepts the Prisma
 * `MatchStatus` literals while remaining open to any string status.
 */
export interface GroupableMatch {
  id: string;
  status: "LIVE" | "UPCOMING" | "COMPLETED" | "POSTPONED" | string;
}

/** The three status buckets the Match Center renders. */
export interface GroupedMatches<T> {
  live: T[];
  upcoming: T[];
  completed: T[];
}

/**
 * Partition matches into Live / Upcoming / Completed by `status`.
 *
 * LIVE -> live, COMPLETED -> completed, and UPCOMING / POSTPONED / any other
 * value -> upcoming. The partition is complete: every input match appears in
 * exactly one bucket (no match is lost or duplicated). Relative input order is
 * preserved within each bucket and the input is not mutated.
 */
export function groupMatches<T extends { status: string }>(
  matches: T[],
): GroupedMatches<T> {
  const live: T[] = [];
  const upcoming: T[] = [];
  const completed: T[] = [];

  for (const match of matches) {
    switch (match.status) {
      case "LIVE":
        live.push(match);
        break;
      case "COMPLETED":
        completed.push(match);
        break;
      // "UPCOMING", "POSTPONED", and any other status fall through to upcoming
      // so the partition stays complete (Property 3).
      default:
        upcoming.push(match);
        break;
    }
  }

  return { live, upcoming, completed };
}
