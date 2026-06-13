import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { orderEvents } from "./events";

// A minimal orderable match event. The `minute` domain is kept deliberately
// small so equal-minute collisions (and thus stable-ordering behavior) are
// exercised frequently, while `id` lets us reason about the multiset of
// elements independently of object identity.
interface TestEvent {
  id: number;
  minute: number;
  label: string;
}

const eventArb: fc.Arbitrary<TestEvent> = fc.record({
  id: fc.integer({ min: 0, max: 1_000_000 }),
  minute: fc.integer({ min: 0, max: 120 }),
  label: fc.constantFrom("goal", "card", "sub", "var", "kickoff"),
});

// Serialize an event for multiset comparison. Including every field ensures we
// detect mutation as well as addition/removal of elements.
const key = (e: TestEvent) => `${e.id}|${e.minute}|${e.label}`;

const multiset = (arr: TestEvent[]) => arr.map(key).sort();

describe("orderEvents (property)", () => {
  // Feature: worldcup-2026-platform, Property 5: For any set of match events, the rendered ordering is a permutation of the input that is non-decreasing by minute.
  // Validates: Requirements 3.6
  it("returns a permutation of the input that is non-decreasing by minute", () => {
    fc.assert(
      fc.property(fc.array(eventArb), (events) => {
        const result = orderEvents(events);

        // 1. The output is a permutation of the input: same multiset of
        //    elements, with nothing added, dropped, duplicated, or mutated.
        expect(multiset(result)).toEqual(multiset(events));

        // 2. The output is ordered non-decreasing by minute.
        for (let i = 1; i < result.length; i++) {
          expect(result[i].minute).toBeGreaterThanOrEqual(
            result[i - 1].minute,
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});
