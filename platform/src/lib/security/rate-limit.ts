/**
 * Fixed-window rate limiter (pure decision core + in-memory store wrapper).
 *
 * Implements Requirement 19.4: when a request exceeds the configured rate limit
 * for an endpoint, the request is rejected with a rate-limit decision (the API
 * layer translates a rejection into HTTP 429 + `Retry-After`).
 *
 * The decision function {@link checkRateLimit} is intentionally **pure, total,
 * and deterministic**: it takes the prior counter state plus the current clock
 * reading and returns the admit/reject decision together with the next state.
 * It performs no IO and reads no ambient clock, which makes it trivially
 * testable (see Property 15) and lets any backing store be swapped in.
 *
 * The store is kept strictly separate from the pure core. A default in-memory
 * {@link InMemoryRateLimitStore} is provided for single-instance / dev usage,
 * behind a {@link RateLimitStore} interface that a Redis-backed implementation
 * can satisfy in production (the "Redis seam" — see Security Strategy, Req 19.4).
 */

/**
 * Per-client counter state for a single fixed window.
 *
 * - `count` — number of requests admitted-or-counted so far in the current window.
 * - `windowStart` — epoch-millis timestamp marking the start of the current window.
 */
export interface RateLimitState {
  count: number;
  windowStart: number;
}

/**
 * Outcome of a single rate-limit decision.
 *
 * - `allowed` — whether the request is admitted.
 * - `nextState` — the counter state to persist for the next decision.
 * - `retryAfterMs` — milliseconds the caller should wait before retrying;
 *   `0` when the request was allowed, otherwise the time remaining until the
 *   current window ends.
 */
export interface RateLimitResult {
  allowed: boolean;
  nextState: RateLimitState;
  retryAfterMs: number;
}

/**
 * Pure fixed-window rate-limit decision.
 *
 * Semantics:
 * - If there is no prior `state`, or `now` falls outside the current window
 *   (`now - state.windowStart >= windowMs`, or `now` precedes the window start),
 *   a fresh window opens: `count` resets to `1` and the request is **allowed**.
 * - Within the current window, the count is incremented. The request is
 *   **allowed** while the resulting count is `<= limit`, and **rejected** once it
 *   would exceed `limit`. On rejection the count is held at `limit + 1` (it does
 *   not grow unbounded across a sustained burst) and `retryAfterMs` reports the
 *   time remaining until the window ends.
 *
 * Therefore, within any single window the first `limit` requests are admitted
 * and every request beyond `limit` is rejected (Requirement 19.4, Property 15).
 *
 * The function is total: a non-positive `limit` rejects every request, and a
 * non-positive `windowMs` is treated as "always start a fresh window" so each
 * request is evaluated against a brand-new window.
 *
 * @param state    Prior counter state, or `undefined` when none exists.
 * @param now      Current time in epoch milliseconds.
 * @param limit    Maximum number of requests admitted per window.
 * @param windowMs Window duration in milliseconds.
 */
export function checkRateLimit(
  state: RateLimitState | undefined,
  now: number,
  limit: number,
  windowMs: number,
): RateLimitResult {
  // A non-positive limit admits nothing.
  if (limit <= 0) {
    return {
      allowed: false,
      nextState: { count: 0, windowStart: now },
      retryAfterMs: windowMs > 0 ? windowMs : 0,
    };
  }

  const isFreshWindow =
    state === undefined ||
    windowMs <= 0 ||
    now - state.windowStart >= windowMs ||
    now < state.windowStart;

  if (isFreshWindow) {
    // Open a new window; this request is the first one in it.
    return {
      allowed: true,
      nextState: { count: 1, windowStart: now },
      retryAfterMs: 0,
    };
  }

  // Within the active window: account for this request.
  const windowStart = state.windowStart;
  const nextCount = state.count + 1;

  if (nextCount <= limit) {
    return {
      allowed: true,
      nextState: { count: nextCount, windowStart },
      retryAfterMs: 0,
    };
  }

  // Over the limit: reject and report time remaining in the window. Clamp the
  // stored count at limit + 1 so a sustained burst does not grow it unboundedly.
  const elapsed = now - windowStart;
  const retryAfterMs = Math.max(0, windowMs - elapsed);
  return {
    allowed: false,
    nextState: { count: limit + 1, windowStart },
    retryAfterMs,
  };
}

/**
 * Storage seam for rate-limit counter state, keyed by an opaque client id
 * (e.g. `"<ip>:<route>"`). The in-memory implementation below is the default;
 * a Redis-backed implementation can satisfy this same interface in production
 * without touching the pure decision core.
 */
export interface RateLimitStore {
  /** Read the current state for `key`, or `undefined` if none is stored. */
  get(key: string): RateLimitState | undefined | Promise<RateLimitState | undefined>;
  /** Persist `state` for `key`. */
  set(key: string, state: RateLimitState): void | Promise<void>;
}

/**
 * Simple in-memory {@link RateLimitStore} backed by a `Map`.
 *
 * Suitable for a single server instance or local development. In a multi-
 * instance deployment, replace this with a shared store (e.g. Redis) that
 * implements {@link RateLimitStore}; the {@link RateLimiter} logic is unchanged.
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly map = new Map<string, RateLimitState>();

  get(key: string): RateLimitState | undefined {
    return this.map.get(key);
  }

  set(key: string, state: RateLimitState): void {
    this.map.set(key, state);
  }
}

/**
 * Stateful wrapper that pairs a {@link RateLimitStore} with the pure
 * {@link checkRateLimit} decision. This is the impure boundary: it reads prior
 * state, runs the pure decision, and writes the next state back.
 *
 * Construct with a store and the limit/window configuration; call {@link consume}
 * per request, passing the client key and the current time. By default the
 * current time defaults to `Date.now()` so callers may omit it.
 */
export class RateLimiter {
  constructor(
    private readonly store: RateLimitStore,
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /**
   * Evaluate one request for `key` and persist the resulting state.
   *
   * @param key Opaque client identifier (e.g. `"<ip>:<route>"`).
   * @param now Current time in epoch millis; defaults to `Date.now()`.
   */
  async consume(key: string, now: number = Date.now()): Promise<RateLimitResult> {
    const prior = await this.store.get(key);
    const result = checkRateLimit(prior ?? undefined, now, this.limit, this.windowMs);
    await this.store.set(key, result.nextState);
    return result;
  }
}
