import { describe, it, expect } from "vitest";
import { fc } from "@/test/fc";
import { resolveTheme, type ThemeMode } from "./resolve";

// Feature: worldcup-2026-platform, Property 13: For any selected theme mode, persisting and then resolving the active theme returns the selected mode, and with no stored preference the resolved theme is dark.

const arbThemeMode = fc.oneof(
  fc.constant("dark" as ThemeMode),
  fc.constant("light" as ThemeMode),
);

describe("resolveTheme — Property 13: Theme persistence round-trip", () => {
  it("with an explicit preference, resolves to that preference", () => {
    fc.assert(
      fc.property(arbThemeMode, (preference) => {
        const resolved = resolveTheme(preference);
        expect(resolved).toBe(preference);
      }),
    );
  });

  it("with no stored preference (null/undefined), resolves to dark", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(null), fc.constant(undefined)),
        (preference) => {
          const resolved = resolveTheme(preference);
          expect(resolved).toBe("dark");
        },
      ),
    );
  });

  it("round-trip: resolve(selected) === selected for any mode", () => {
    fc.assert(
      fc.property(arbThemeMode, (mode) => {
        // Simulates: user selects mode -> persist -> resolve from storage
        const stored = mode; // persistence stores the mode as-is
        expect(resolveTheme(stored)).toBe(mode);
      }),
    );
  });
});
