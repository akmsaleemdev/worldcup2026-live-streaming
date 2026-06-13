import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { buildPlaylist, type ResolvedSource } from "./playlist";

// Arbitrary that generates a single ResolvedSource with a deliberately small
// `priority` domain so equal-priority collisions (and thus ordering) are
// exercised frequently, and a mix of legallyPermitted/active flags.
const resolvedSourceArb: fc.Arbitrary<ResolvedSource> = fc.record({
  id: fc.string({ minLength: 1 }),
  url: fc.webUrl(),
  quality: fc.constantFrom("1080p", "720p", "480p", "auto"),
  language: fc.constantFrom("EN", "FR", "ES", "AR"),
  type: fc.constantFrom("hls", "dash"),
  priority: fc.integer({ min: 0, max: 5 }),
  legallyPermitted: fc.boolean(),
  active: fc.boolean(),
});

describe("buildPlaylist (property)", () => {
  // Feature: worldcup-2026-platform, Property 1: For any set of stream sources, buildPlaylist returns exactly the legallyPermitted && active sources, sorted by priority non-decreasing.
  // Validates: Requirements 2.4, 2.6, 21.3
  it("returns exactly the permitted+active sources, sorted by priority non-decreasing", () => {
    fc.assert(
      fc.property(fc.array(resolvedSourceArb), (sources) => {
        const result = buildPlaylist(sources);

        // 1. Output contains exactly the legallyPermitted && active sources.
        const expected = sources.filter((s) => s.legallyPermitted && s.active);
        expect(result).toHaveLength(expected.length);

        // Every element of the output is permitted + active.
        for (const source of result) {
          expect(source.legallyPermitted).toBe(true);
          expect(source.active).toBe(true);
        }

        // Same multiset of ids as the expected filtered set (no additions,
        // drops, or duplications).
        const sortIds = (arr: ResolvedSource[]) =>
          arr.map((s) => s.id).sort();
        expect(sortIds(result)).toEqual(sortIds(expected));

        // 2. Output is sorted by priority in non-decreasing order.
        for (let i = 1; i < result.length; i++) {
          expect(result[i].priority).toBeGreaterThanOrEqual(
            result[i - 1].priority,
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});
