import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { contrastRatio } from "./contrast";

/**
 * Supported KOORAKIT themes and their body-text / background token pairs.
 *
 * These mirror the raw `--kk-*` brand tokens declared in `src/app/globals.css`.
 * Dark is the default (and currently the only concretely-tokenized) theme; the
 * semantic `--color-foreground` resolves to `--kk-text` (body text) and
 * `--color-background` resolves to `--kk-bg`. A future light theme (Tier 3)
 * would re-declare these `--kk-*` values and add an entry here, at which point
 * this property test guards its body-text contrast automatically.
 */
const SUPPORTED_THEME_TOKENS = {
  dark: { bodyText: "#E8EAED", background: "#0A1A3F" },
} as const;

const SUPPORTED_THEMES = Object.keys(
  SUPPORTED_THEME_TOKENS,
) as Array<keyof typeof SUPPORTED_THEME_TOKENS>;

// WCAG 2.x AA threshold for normal-size body text.
const AA_BODY_TEXT = 4.5;

describe("theme contrast (property)", () => {
  // Feature: worldcup-2026-platform, Property 14: For any supported theme, the contrast ratio between the body-text token and its background token is at least 4.5:1.
  // Validates: Requirements 18.3
  it("body-text token meets WCAG AA (>= 4.5:1) against its background for every supported theme", () => {
    fc.assert(
      fc.property(fc.constantFrom(...SUPPORTED_THEMES), (theme) => {
        const { bodyText, background } = SUPPORTED_THEME_TOKENS[theme];
        expect(contrastRatio(bodyText, background)).toBeGreaterThanOrEqual(
          AA_BODY_TEXT,
        );
      }),
      { numRuns: 100 },
    );
  });
});
