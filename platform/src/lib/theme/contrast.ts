/**
 * WCAG 2.x color contrast utility (pure, no IO).
 *
 * Implements Requirement 18.3 and supports Correctness Property 14: for any
 * supported theme, the contrast ratio between the body-text token and its
 * background token is at least 4.5:1.
 *
 * All functions are self-contained and free of side effects so they can be
 * unit- and property-tested in isolation. The math follows the WCAG 2.x
 * definitions exactly:
 *   - relative luminance via sRGB channel linearization
 *     (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance)
 *   - contrast ratio (L1 + 0.05) / (L2 + 0.05) with L1 >= L2
 *     (https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio)
 *
 * Accepted color formats (see `parseHex`):
 *   - 6-digit hex: "#0A1A3F" or "0A1A3F"
 *   - 3-digit shorthand hex: "#FFF" or "FFF" (each nibble is doubled)
 *   - The leading "#" is optional; parsing is case-insensitive.
 *
 * Invalid input handling (documented choice): `parseHex` THROWS a `TypeError`
 * on any string that is not a well-formed 3- or 6-digit hex color. We throw
 * rather than clamp so that malformed design tokens fail loudly at the call
 * site instead of silently producing a misleading contrast ratio.
 */

/** An sRGB color with 8-bit channels in the range 0..255. */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

const HEX_3 = /^#?([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;
const HEX_6 = /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/;

/**
 * Parse a hex color string into `{ r, g, b }` channels (each 0..255).
 *
 * Accepts 3- or 6-digit hex, with an optional leading "#", case-insensitive.
 * A 3-digit value such as "#abc" expands to "#aabbcc".
 *
 * @throws {TypeError} if the input is not a well-formed 3- or 6-digit hex color.
 */
export function parseHex(color: string): RGB {
  if (typeof color !== "string") {
    throw new TypeError(`Expected a hex color string, received ${typeof color}`);
  }

  const trimmed = color.trim();

  const short = HEX_3.exec(trimmed);
  if (short) {
    return {
      r: parseInt(short[1] + short[1], 16),
      g: parseInt(short[2] + short[2], 16),
      b: parseInt(short[3] + short[3], 16),
    };
  }

  const full = HEX_6.exec(trimmed);
  if (full) {
    return {
      r: parseInt(full[1], 16),
      g: parseInt(full[2], 16),
      b: parseInt(full[3], 16),
    };
  }

  throw new TypeError(
    `Invalid hex color "${color}": expected a 3- or 6-digit hex string (e.g. "#0A1A3F" or "#FFF").`,
  );
}

/**
 * Linearize a single sRGB channel value (0..255) to its linear-light value
 * in the range 0..1, per the WCAG relative-luminance definition.
 */
function linearizeChannel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Compute the WCAG relative luminance of a color, a value in the range 0..1
 * where 0 is the darkest black and 1 is the lightest white.
 *
 * Accepts a hex color string (any format supported by `parseHex`) or an
 * already-parsed `RGB` object.
 */
export function relativeLuminance(color: string | RGB): number {
  const { r, g, b } = typeof color === "string" ? parseHex(color) : color;
  return (
    0.2126 * linearizeChannel(r) +
    0.7152 * linearizeChannel(g) +
    0.0722 * linearizeChannel(b)
  );
}

/**
 * Compute the WCAG contrast ratio between two colors.
 *
 * Returns `(L1 + 0.05) / (L2 + 0.05)` where `L1` is the larger and `L2` the
 * smaller of the two relative luminances. The result is symmetric in its
 * arguments and lies in the range 1 (identical luminance) to 21 (pure black
 * against pure white).
 *
 * Accepts hex color strings or `RGB` objects for either argument.
 */
export function contrastRatio(a: string | RGB, b: string | RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determine whether two colors meet the WCAG 2.x AA contrast threshold.
 *
 * Normal text requires a ratio of at least 4.5:1; large text (>= 18pt, or
 * >= 14pt bold) requires at least 3:1.
 */
export function meetsAA(
  a: string | RGB,
  b: string | RGB,
  largeText = false,
): boolean {
  return contrastRatio(a, b) >= (largeText ? 3 : 4.5);
}
