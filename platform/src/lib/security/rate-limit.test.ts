import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { checkRateLimit, type RateLimitState } from "./rate-limit";

// Feature: worldcup-2026-platform, Property 15: For any burst of requests within one window, the first N (the limit) are admitted and every request beyond N is rejected.
//
// Validates: Requirements 19.4
describe("checkRateLimit — Property 15 (admit up to the limit, reject beyond)", () => {
  it("admits the first N requests and rejects every request beyond N within one window", () => {
    fc.assert(
      fc.property(
        // limit N >= 1
        fc.integer({ min: 1, max: 200 }),
        // extra requests beyond the limit, so the burst size M = N + extra >= N
        fc.integer({ min: 0, max: 200 }),
        // window duration in ms (positive)
        fc.integer({ min: 1, max: 1_000_000 }),
        // window start timestamp (epoch millis)
        fc.integer({ min: 0, max: 4_000_000_000_000 }),
        (limit, extra, windowMs, windowStart) => {
          const burst = limit + extra;

          // Drive a burst of `burst` requests, all landing inside a single
          // window. We hold `now` fixed at windowStart so every request is
          // evaluated against the same window (now - windowStart = 0 < windowMs).
          const now = windowStart;
          let state: RateLimitState | undefined = undefined;

          for (let i = 1; i <= burst; i++) {
            const result = checkRateLimit(state, now, limit, windowMs);
            state = result.nextState;

            if (i <= limit) {
              // The first N requests must be admitted.
              expect(result.allowed).toBe(true);
              expect(result.retryAfterMs).toBe(0);
            } else {
              // Every request beyond N must be rejected.
              expect(result.allowed).toBe(false);
              // A rejection within the window reports a non-negative retry hint.
              expect(result.retryAfterMs).toBeGreaterThanOrEqual(0);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
