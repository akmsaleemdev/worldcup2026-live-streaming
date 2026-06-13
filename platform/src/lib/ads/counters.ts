/**
 * Ad counter accumulation (pure, no IO).
 *
 * Implements Requirement 14.5: ad placements record impression and click
 * events, and the stored counters on an `Advertisement` are incremented
 * accordingly. The `POST /api/ads/[id]/event` route handler persists the
 * results, but the counting logic itself lives here as a pure, side-effect-free
 * module so it can be unit- and property-tested in isolation
 * (Correctness Property 12).
 *
 * The field names (`impressions`, `clicks`) mirror the Prisma `Advertisement`
 * model so the route can fold an event sequence straight onto a stored record.
 */

/** The kinds of ad interaction the platform counts. */
export type AdEventType = "impression" | "click";

/** A single ad interaction event. */
export interface AdEvent {
  type: AdEventType;
}

/**
 * The accumulated counters for an advertisement, matching the Prisma
 * `Advertisement.impressions` / `Advertisement.clicks` fields.
 */
export interface AdCounters {
  impressions: number;
  clicks: number;
}

/** Counters with both totals at zero. */
export const EMPTY_AD_COUNTERS: AdCounters = { impressions: 0, clicks: 0 };

/**
 * Apply a single ad event to a set of counters, returning a NEW counters
 * object. An `"impression"` event increments `impressions` by one; a
 * `"click"` event increments `clicks` by one. The input is never mutated.
 *
 * This is the reducer step used by {@link applyAdEvents}.
 */
export function applyAdEvent(counters: AdCounters, event: AdEvent): AdCounters {
  switch (event.type) {
    case "impression":
      return {
        impressions: counters.impressions + 1,
        clicks: counters.clicks,
      };
    case "click":
      return {
        impressions: counters.impressions,
        clicks: counters.clicks + 1,
      };
    default: {
      // Exhaustiveness guard: unknown event types leave counters untouched.
      const _exhaustive: never = event.type;
      void _exhaustive;
      return { impressions: counters.impressions, clicks: counters.clicks };
    }
  }
}

/**
 * Fold a sequence of ad events onto an initial set of counters.
 *
 * The returned counters satisfy:
 *   - `impressions` == `initial.impressions` + (number of impression events)
 *   - `clicks`      == `initial.clicks`      + (number of click events)
 *
 * The `initial` argument and the `events` array are never mutated; a new
 * counters object is always returned. Defaults to {@link EMPTY_AD_COUNTERS}
 * so the function can also build counters from scratch.
 */
export function applyAdEvents(
  initial: AdCounters = EMPTY_AD_COUNTERS,
  events: AdEvent[] = [],
): AdCounters {
  return events.reduce(applyAdEvent, {
    impressions: initial.impressions,
    clicks: initial.clicks,
  });
}
