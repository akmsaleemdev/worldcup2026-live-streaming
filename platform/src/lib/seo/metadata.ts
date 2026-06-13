/**
 * Page metadata builder (pure, deterministic, no IO).
 *
 * Implements Requirements 8.1 and 20.3 and underpins Property 8: for any
 * indexable entity (page, article, match, team) the produced metadata carries
 * a non-empty `title`, `description`, OpenGraph block, and Twitter card, plus a
 * canonical URL that is always an absolute HTTPS URL.
 *
 * The return value is typed as Next's `Metadata` so it can be returned directly
 * from a route's `generateMetadata` (wiring happens in task 8.5, not here).
 *
 * The core logic is pure and deterministic given its inputs: the only ambient
 * value it reads is `process.env.NEXT_PUBLIC_SITE_URL`, used solely as the
 * default base URL when an explicit `baseUrl` is not provided. Pass `baseUrl`
 * to keep a call fully deterministic (e.g. in tests).
 */

import type { Metadata } from "next";

/** The kinds of indexable entity KOORAKIT generates metadata for. */
export type SeoEntityType = "page" | "article" | "match" | "team";

/** Input describing the page/entity to build metadata for. */
export interface BuildMetadataInput {
  /**
   * Path or slug of the page, e.g. "/matches/123" or "news/my-article". A
   * leading slash is optional; an empty/"/" path resolves to the site root.
   */
  path?: string;
  /**
   * Site base URL. Defaults to `process.env.NEXT_PUBLIC_SITE_URL` and finally
   * to `https://koorakit.com`. Any scheme is normalized to `https://` so the
   * canonical URL is always HTTPS.
   */
  baseUrl?: string;
  /** Page-specific title. The KOORAKIT brand suffix is appended when absent. */
  title?: string;
  /** Page-specific description. A sensible KOORAKIT default is used when empty. */
  description?: string;
  /** Entity kind; only affects the OpenGraph `type` (article vs website). */
  type?: SeoEntityType;
  /** A single share image (absolute URL or site-relative path). */
  image?: string;
  /** Multiple share images (absolute URLs or site-relative paths). */
  images?: string[];
}

/** KOORAKIT brand name used for the title suffix and OpenGraph `siteName`. */
export const SITE_NAME = "KOORAKIT";

/** Final fallback base URL (always HTTPS). */
export const DEFAULT_BASE_URL = "https://koorakit.com";

/** Default title used when no page-specific title is supplied. */
export const DEFAULT_TITLE = "KOORAKIT — The Global Football Festival";

/** Default description used when no page-specific description is supplied. */
export const DEFAULT_DESCRIPTION =
  "Watch live World Cup 2026 matches and follow scores, standings, knockout brackets, teams, and football news on KOORAKIT — The Global Football Festival.";

/** Default share image (site-relative; resolved to an absolute HTTPS URL). */
export const DEFAULT_OG_IMAGE = "/og/koorakit-default.jpg";

/**
 * Resolve the effective base host (no scheme, no trailing slash).
 *
 * Strips any leading scheme (`https://`, `http://`, protocol-relative `//`) and
 * trailing slashes so a single `https://` can be prepended deterministically.
 * Falls back to the KOORAKIT default host when the input is empty.
 */
function resolveHost(baseUrl: string | undefined): string {
  const raw = (
    baseUrl ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    DEFAULT_BASE_URL
  ).trim();

  const host = raw
    .replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "") // strip scheme://
    .replace(/^\/\//, "") // strip protocol-relative //
    .replace(/\/+$/, ""); // strip trailing slashes

  return host === "" ? DEFAULT_BASE_URL.replace(/^https:\/\//, "") : host;
}

/** Normalize a path/slug to either "" (root) or "/segment/...". */
function normalizePath(path: string | undefined): string {
  const trimmed = (path ?? "").trim();
  if (trimmed === "" || trimmed === "/") {
    return "";
  }
  return "/" + trimmed.replace(/^\/+/, "").replace(/\/+$/, "");
}

/**
 * Join a base URL and path into an absolute HTTPS URL.
 *
 * The result is guaranteed to start with `https://` regardless of the scheme
 * (or lack thereof) on the provided base URL.
 */
export function toAbsoluteHttpsUrl(
  baseUrl: string | undefined,
  path: string | undefined,
): string {
  return `https://${resolveHost(baseUrl)}${normalizePath(path)}`;
}

/** Resolve a single image reference to an absolute HTTPS URL. */
function resolveImageUrl(image: string, baseUrl: string | undefined): string {
  const value = image.trim();
  if (/^https?:\/\//i.test(value)) {
    // Absolute URL: force HTTPS.
    return value.replace(/^http:\/\//i, "https://");
  }
  if (value.startsWith("//")) {
    // Protocol-relative URL: pin to HTTPS.
    return `https:${value}`;
  }
  // Site-relative path: join against the base host.
  return toAbsoluteHttpsUrl(baseUrl, value);
}

/** Collect, de-duplicate, and absolutize the share images (never empty). */
function resolveImages(
  input: BuildMetadataInput,
  baseUrl: string | undefined,
): string[] {
  const candidates = [
    ...(input.image ? [input.image] : []),
    ...(input.images ?? []),
  ].filter((value) => value.trim() !== "");

  const sources = candidates.length > 0 ? candidates : [DEFAULT_OG_IMAGE];

  const resolved = sources.map((value) => resolveImageUrl(value, baseUrl));
  return Array.from(new Set(resolved));
}

/** Build the page title, appending the KOORAKIT brand suffix when needed. */
function resolveTitle(title: string | undefined): string {
  const trimmed = (title ?? "").trim();
  if (trimmed === "") {
    return DEFAULT_TITLE;
  }
  return trimmed.includes(SITE_NAME) ? trimmed : `${trimmed} | ${SITE_NAME}`;
}

/**
 * Build a Next.js `Metadata` object for an indexable entity.
 *
 * Guarantees (Property 8):
 *  - `title` and `description` are always non-empty (KOORAKIT defaults applied).
 *  - `openGraph` and `twitter` blocks are always populated with non-empty
 *    title/description and at least one image.
 *  - `alternates.canonical` and `openGraph.url` are the same absolute HTTPS URL.
 *
 * Pure and deterministic given its inputs (pass `baseUrl` to avoid reading the
 * `NEXT_PUBLIC_SITE_URL` environment variable).
 */
export function buildMetadata(input: BuildMetadataInput = {}): Metadata {
  const title = resolveTitle(input.title);
  const description =
    (input.description ?? "").trim() !== ""
      ? input.description!.trim()
      : DEFAULT_DESCRIPTION;
  const canonical = toAbsoluteHttpsUrl(input.baseUrl, input.path);
  const imageUrls = resolveImages(input, input.baseUrl);
  const ogType: "article" | "website" =
    input.type === "article" ? "article" : "website";

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: ogType,
      siteName: SITE_NAME,
      images: imageUrls.map((url) => ({ url })),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrls,
    },
  };
}
