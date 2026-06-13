/**
 * Theme resolution — pure logic for the KOORAKIT Theme_Engine.
 *
 * Decides the active theme from a stored preference and an optional system
 * hint. Dark is the default whenever no explicit preference is stored
 * (Req 7.2). Light-mode switching, persistence, and the switcher UI are
 * Tier 3 (task 18.1); this module stays forward-compatible by already
 * honoring an explicit "light" preference and a system fallback.
 *
 * Supports Property 13: with no stored preference, the resolved theme is dark.
 */

export type ThemeMode = "dark" | "light";

/**
 * Resolve the active theme.
 *
 * @param preference The stored user preference, or null/undefined when none.
 * @param system     Optional system color-scheme hint used only when there is
 *                   no explicit preference. Defaults to "dark".
 * @returns The active theme: an explicit preference wins; otherwise the system
 *          hint; otherwise "dark".
 */
export function resolveTheme(
  preference: ThemeMode | null | undefined,
  system: ThemeMode = "dark",
): ThemeMode {
  if (preference === "dark" || preference === "light") {
    return preference;
  }
  return system === "light" ? "light" : "dark";
}
