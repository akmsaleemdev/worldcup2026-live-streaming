import { describe, it } from "vitest";
import { fc } from "../../test/fc";
import { groupMatches, type GroupableMatch } from "./grouping";

// Feature: worldcup-2026-platform, Property 3: For any set of matches, grouping places every match in exactly the bucket matching its status; the multiset union of the three buckets equals the input.
//
// _Validates: Requirements 3.1_
//
// LIVE -> live, COMPLETED -> completed, and UPCOMING / POSTPONED / any other
// status -> upcoming. The partition must be complete and disjoint: every input
// match lands in exactly the bucket for its status, and the multiset union of
// the three buckets equals the input (no loss, no duplication).

// Generate matches whose status is biased toward the recognized literals while
// still exercising arbitrary "other" strings (which must group as upcoming).
const matchArb: fc.Arbitrary<GroupableMatch> = fc.record({
  id: fc.string(),
  status: fc.oneof(
    fc.constantFrom("LIVE", "UPCOMING", "COMPLETED", "POSTPONED"),
    fc.string(),
  ),
});

// The expected bucket for a status, derived independently from grouping.ts.
function expectedBucket(status: string): "live" | "upcoming" | "completed" {
  if (status === "LIVE") return "live";
  if (status === "COMPLETED") return "completed";
  return "upcoming";
}

// Build a multiset of object identities so union equality ignores ordering.
function identityCounts(items: readonly object[]): Map<object, number> {
  const counts = new Map<object, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return counts;
}

describe("match grouping (Property 3)", () => {
  it("places every match in exactly its status bucket and the union equals the input", () => {
    fc.assert(
      fc.property(fc.array(matchArb), (matches) => {
        const { live, upcoming, completed } = groupMatches(matches);

        // 1. Every match lands in exactly the bucket matching its status, and
        //    only matches with that status appear in each bucket.
        for (const m of live) {
          if (expectedBucket(m.status) !== "live") return false;
        }
        for (const m of upcoming) {
          if (expectedBucket(m.status) !== "upcoming") return false;
        }
        for (const m of completed) {
          if (expectedBucket(m.status) !== "completed") return false;
        }

        // 2. The multiset union of the three buckets equals the input
        //    (no loss, no duplication). Compare by object identity so a match
        //    appears in the union exactly as many times as in the input.
        const unionCounts = identityCounts([...live, ...upcoming, ...completed]);
        const inputCounts = identityCounts(matches);

        if (unionCounts.size !== inputCounts.size) return false;
        for (const [match, count] of inputCounts) {
          if (unionCounts.get(match) !== count) return false;
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });
});
