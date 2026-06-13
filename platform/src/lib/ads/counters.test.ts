import { describe, it, expect } from "vitest";
import { fc } from "@/test/fc";
import { applyAdEvents, EMPTY_AD_COUNTERS, AdEvent, AdCounters } from "./counters";

// Feature: worldcup-2026-platform, Property 12: For any sequence of impression and click events, the stored impressions and clicks counters equal the number of impression and click events respectively.

const arbAdEvent: fc.Arbitrary<AdEvent> = fc.oneof(
  fc.constant({ type: "impression" as const }),
  fc.constant({ type: "click" as const }),
);

const arbInitialCounters: fc.Arbitrary<AdCounters> = fc.record({
  impressions: fc.nat({ max: 10000 }),
  clicks: fc.nat({ max: 10000 }),
});

describe("applyAdEvents — Property 12: Ad counters accumulate exactly", () => {
  it("counters equal initial + count of each event type", () => {
    fc.assert(
      fc.property(
        arbInitialCounters,
        fc.array(arbAdEvent, { maxLength: 100 }),
        (initial, events) => {
          const result = applyAdEvents(initial, events);

          const impressionCount = events.filter((e) => e.type === "impression").length;
          const clickCount = events.filter((e) => e.type === "click").length;

          expect(result.impressions).toBe(initial.impressions + impressionCount);
          expect(result.clicks).toBe(initial.clicks + clickCount);
        },
      ),
    );
  });

  it("empty event sequence returns initial counters unchanged", () => {
    fc.assert(
      fc.property(arbInitialCounters, (initial) => {
        const result = applyAdEvents(initial, []);
        expect(result.impressions).toBe(initial.impressions);
        expect(result.clicks).toBe(initial.clicks);
      }),
    );
  });

  it("from zero initial, counters exactly count events", () => {
    fc.assert(
      fc.property(fc.array(arbAdEvent, { maxLength: 100 }), (events) => {
        const result = applyAdEvents(EMPTY_AD_COUNTERS, events);

        const impressionCount = events.filter((e) => e.type === "impression").length;
        const clickCount = events.filter((e) => e.type === "click").length;

        expect(result.impressions).toBe(impressionCount);
        expect(result.clicks).toBe(clickCount);
      }),
    );
  });
});
