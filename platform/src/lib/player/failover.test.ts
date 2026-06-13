import { describe, expect, it } from "vitest";
import { fc } from "../../test/fc";
import type { ResolvedSource, StreamType } from "./playlist";
import { hasNext, initFailover, nextSource } from "./failover";

/** Arbitrary for a single resolved source (field values are irrelevant to ordering). */
const sourceArb: fc.Arbitrary<ResolvedSource> = fc.record({
  id: fc.uuid(),
  url: fc.webUrl(),
  quality: fc.constantFrom("1080p", "720p", "auto"),
  language: fc.constantFrom("EN", "FR", "ES"),
  type: fc.constantFrom<StreamType>("hls", "dash"),
  priority: fc.integer({ min: 0, max: 100 }),
  legallyPermitted: fc.boolean(),
  active: fc.boolean(),
});

/** Arbitrary resolved playlists, including the empty playlist. */
const playlistArb: fc.Arbitrary<ResolvedSource[]> = fc.array(sourceArb, {
  maxLength: 12,
});

describe("failover advancement (Property 2)", () => {
  // Feature: worldcup-2026-platform, Property 2: For any resolved playlist, repeatedly applying nextSource visits sources strictly in order without repetition, and hasNext returns false once exhausted.
  // _Validates: Requirements 1.7, 1.8_
  it("visits sources strictly in order without repetition and signals exhaustion", () => {
    fc.assert(
      fc.property(playlistArb, (sources) => {
        let state = initFailover(sources);
        const visitedIds: string[] = [];

        // Walk the playlist by repeatedly advancing while a next source exists.
        // Each step must move to exactly the next source in the original order.
        while (hasNext(state)) {
          const currentIndex = state.index;
          // The source at the current index is the one being attempted.
          visitedIds.push(sources[currentIndex].id);

          const next = nextSource(state);
          // Strictly in order: index advances by exactly one, no skipping/repeating.
          expect(next.index).toBe(currentIndex + 1);
          // nextSource is pure: it does not mutate the input state.
          expect(state.index).toBe(currentIndex);
          // The playlist reference is carried over unchanged.
          expect(next.sources).toBe(sources);

          state = next;
        }

        // hasNext is false exactly when there is no source after the current one.
        expect(hasNext(state)).toBe(false);
        expect(state.index).toBe(Math.max(sources.length - 1, 0));

        // Record the final source reached (if any) so we cover the full sequence.
        if (sources.length > 0) {
          visitedIds.push(sources[state.index].id);
        }

        // Visited sequence equals the playlist in order, position-for-position,
        // with no repetition beyond what the playlist itself contains.
        const expectedIds = sources.map((source) => source.id);
        expect(visitedIds).toEqual(expectedIds);
      }),
    );
  });
});
