import { describe, expect, it } from "vitest";

import { computeRemaining } from "./Countdown";

/**
 * Unit tests for the home-page countdown's pure remaining-time helper
 * (Req 10.1). Covers a normal future target, the elapsed/"done" boundary, and
 * an invalid target string.
 */
describe("computeRemaining", () => {
  const base = Date.UTC(2026, 0, 1, 0, 0, 0); // 2026-01-01T00:00:00Z

  it("breaks a future diff into days/hours/minutes/seconds", () => {
    const target = new Date(
      base + ((2 * 24 + 3) * 3_600 + 4 * 60 + 5) * 1_000,
    ).toISOString();

    expect(computeRemaining(target, base)).toEqual({
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
      done: false,
    });
  });

  it("marks the countdown done when the target has been reached", () => {
    const target = new Date(base).toISOString();
    expect(computeRemaining(target, base).done).toBe(true);
    expect(computeRemaining(target, base + 10_000).done).toBe(true);
  });

  it("returns a non-done zero snapshot for an invalid target", () => {
    expect(computeRemaining("not-a-date", base)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      done: false,
    });
  });
});
