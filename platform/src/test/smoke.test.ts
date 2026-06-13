import { describe, expect, it } from "vitest";
import { fc } from "./fc";

describe("test harness smoke test", () => {
  it("runs a trivial assertion", () => {
    expect(true).toBe(true);
  });

  it("has fast-check wired with a global run configuration", () => {
    // Confirms the fast-check global config import is active.
    expect(fc.readConfigureGlobal()?.numRuns).toBe(100);
  });

  it("evaluates a basic property over many inputs", () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a;
      }),
    );
  });
});
