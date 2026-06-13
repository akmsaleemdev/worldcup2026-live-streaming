/**
 * URL-safe slug generation (pure, no IO).
 *
 * Implements Requirement 11.4 and supports Correctness Property 10: for any
 * article title, the generated slug matches `^[a-z0-9]+(?:-[a-z0-9]+)*$`, and
 * applying `slugify` to an already-generated slug returns the same slug
 * (idempotence): `slugify(slugify(x)) === slugify(x)`.
 *
 * The transformation pipeline is:
 *   1. Unicode-normalize (NFKD) and strip combining diacritical marks so that
 *      accented characters fold to their ASCII base (e.g. "Müller" -> "muller",
 *      "São Paulo" -> "sao-paulo").
 *   2. Lowercase.
 *   3. Replace every run of characters that is not `[a-z0-9]` with a single
 *      hyphen. This collapses whitespace, punctuation, symbols, and any
 *      remaining non-ASCII characters, and prevents repeated hyphens.
 *   4. Trim leading and trailing hyphens.
 *
 * Empty / all-symbol input handling (documented choice): when the input
 * contains no alphanumeric characters (empty string, whitespace only, pure
 * punctuation/emoji, etc.), `slugify` returns the empty string `""`. We return
 * an empty string rather than a synthetic fallback so that callers can detect
 * "no usable slug" explicitly and apply their own policy (e.g. fall back to an
 * id or reject the input). Note that `""` does not match the non-empty slug
 * regex; the regex guarantee applies only to non-empty results. Idempotence
 * still holds because `slugify("") === ""`.
 */

/** Matches one or more characters that are NOT lowercase ASCII alphanumerics. */
const NON_ALNUM_RUN = /[^a-z0-9]+/g;

/** Matches leading and/or trailing hyphens. */
const EDGE_HYPHENS = /^-+|-+$/g;

/** Matches Unicode combining diacritical marks (produced by NFKD normalize). */
const COMBINING_MARKS = /[\u0300-\u036f]/g;

/**
 * Convert an arbitrary title into a URL-safe slug.
 *
 * The result is either the empty string `""` (when the input has no
 * alphanumeric content) or a string matching `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
 * The function is idempotent: `slugify(slugify(x)) === slugify(x)`.
 *
 * @param title - The source text (e.g. an article title).
 * @returns A lowercase, hyphen-separated, diacritic-free slug, or `""`.
 */
export function slugify(title: string): string {
  if (typeof title !== "string") {
    return "";
  }

  return title
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(NON_ALNUM_RUN, "-")
    .replace(EDGE_HYPHENS, "");
}
