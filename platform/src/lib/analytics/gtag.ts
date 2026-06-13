/**
 * Client-side Google Analytics 4 / Google Tag Manager helpers (Req 14.1–14.3).
 *
 * These functions are the single, isolated boundary between the app and the
 * Google analytics globals (`window.gtag` / `window.dataLayer`). They are
 * intentionally defensive: every call is a no-op when
 *   - it runs on the server (`window` is undefined), or
 *   - no measurement/container ID is configured, or
 *   - the analytics globals have not loaded yet.
 *
 * External analytics is strictly best-effort: a missing ID, a blocked script,
 * or a throwing global must NEVER break rendering, navigation, or playback. All
 * calls are wrapped so failures are swallowed (Req 14.x constraint).
 *
 * Environment IDs are read from `NEXT_PUBLIC_*` vars. Next.js inlines these at
 * build time, so each name is referenced literally. The GA4 measurement ID
 * accepts either `NEXT_PUBLIC_GA4_ID` or `NEXT_PUBLIC_GA_ID` (the latter matches
 * the project `.env.example`); GA4 takes precedence when both are set.
 */

/** Resolved GA4 measurement ID (e.g. `G-XXXXXXXXXX`), or `""` when unset. */
export const GA_MEASUREMENT_ID: string =
  process.env.NEXT_PUBLIC_GA4_ID ?? process.env.NEXT_PUBLIC_GA_ID ?? "";

/** Resolved GTM container ID (e.g. `GTM-XXXXXXX`), or `""` when unset. */
export const GTM_CONTAINER_ID: string = process.env.NEXT_PUBLIC_GTM_ID ?? "";

/** True when a GA4 measurement ID is configured. */
export const isGaEnabled: boolean = GA_MEASUREMENT_ID.length > 0;

/** True when a GTM container ID is configured. */
export const isGtmEnabled: boolean = GTM_CONTAINER_ID.length > 0;

/** True when any analytics integration is configured. */
export const isAnalyticsEnabled: boolean = isGaEnabled || isGtmEnabled;

/** Loosely-typed gtag command signature. */
type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

/**
 * Push an event/command onto the GTM `dataLayer`. Safe no-op on the server or
 * before the dataLayer is initialized. Errors are swallowed.
 */
export function pushDataLayer(payload: Record<string, unknown>): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push(payload);
  } catch {
    // Best-effort only — never surface analytics failures.
  }
}

/**
 * Invoke `window.gtag` with arbitrary arguments. Safe no-op when gtag has not
 * loaded. Errors are swallowed.
 */
function gtag(...args: unknown[]): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  try {
    window.gtag(...args);
  } catch {
    // Best-effort only.
  }
}

/**
 * Emit a GA4 page-view for `url` (Req 14.1). No-op when GA is not configured.
 * Also mirrors the navigation onto the GTM dataLayer so container-side tags can
 * react (Req 14.2).
 */
export function trackPageView(url: string): void {
  if (isGaEnabled) {
    gtag("event", "page_view", { page_path: url, page_location: url });
  }
  if (isGtmEnabled) {
    pushDataLayer({ event: "page_view", page_path: url });
  }
}

/**
 * Emit an arbitrary GA4 event (Req 14.3). No-op when GA is not configured.
 * The event is also pushed to the GTM dataLayer when GTM is configured.
 */
export function trackEvent(
  name: string,
  params: Record<string, unknown> = {},
): void {
  if (isGaEnabled) {
    gtag("event", name, params);
  }
  if (isGtmEnabled) {
    pushDataLayer({ event: name, ...params });
  }
}
