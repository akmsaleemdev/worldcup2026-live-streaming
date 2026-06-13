/**
 * Stream source health probing (Requirement 2.3).
 *
 * This module is split into two layers so the decision logic stays pure and
 * trivially testable, while the network access is isolated behind a single
 * impure function:
 *
 *   - `classifyHealth(status, ok)` — PURE. Given the HTTP status code (or
 *     `null` when no response was received) and the fetch `ok` flag, it decides
 *     whether the source should be considered healthy. No IO, no clock.
 *   - `probeSource(url, opts?)` — IMPURE. Performs a lightweight `HEAD`
 *     (or ranged `GET`) request against the source URL with an
 *     `AbortController` timeout, then delegates the verdict to
 *     `classifyHealth`. On any network error or timeout it reports the source
 *     as unhealthy with a `null` status.
 *
 * Keeping the classifier separate means the health rules can be unit-tested
 * without a network, and `probeSource` only has to be exercised with
 * integration/smoke tests.
 */

/** Result of classifying a probe outcome (pure). */
export interface HealthClassification {
  healthy: boolean;
  lastStatus: number | null;
}

/** Result of probing a source (pure verdict + observation timestamp). */
export interface HealthProbeResult extends HealthClassification {
  lastCheckedAt: Date;
}

/** HTTP method used to probe a source. */
export type ProbeMethod = "HEAD" | "GET";

/** Options controlling a single `probeSource` call. */
export interface ProbeOptions {
  /** Abort the request after this many milliseconds. Defaults to 10000. */
  timeoutMs?: number;
  /**
   * Probe method. `HEAD` is cheapest; some origins/CDNs reject `HEAD` for
   * M3U8 playlists, in which case a ranged `GET` (first byte) is appropriate.
   * Defaults to `HEAD`.
   */
  method?: ProbeMethod;
  /**
   * Injectable fetch implementation (primarily for testing). Defaults to the
   * global `fetch`.
   */
  fetchImpl?: typeof fetch;
  /**
   * Injectable clock for the `lastCheckedAt` timestamp (primarily for
   * testing). Defaults to `() => new Date()`.
   */
  now?: () => Date;
}

/**
 * Classify a probe outcome into a health verdict (PURE).
 *
 * Rules for an M3U8 `HEAD`/ranged-`GET` probe:
 *   - `2xx` (including `206 Partial Content` from a ranged GET): healthy. The
 *     origin is reachable and serving the playlist.
 *   - `3xx`: healthy. A redirect means the origin is alive; HLS.js / the
 *     browser fetch layer transparently follows redirects to the real
 *     playlist, so a redirect is not a failure for availability purposes.
 *   - `405 Method Not Allowed`: healthy. Some CDNs reject `HEAD` on playlist
 *     URLs while serving `GET` perfectly well. A `405` therefore proves the
 *     origin is reachable and responding, so we treat it as available rather
 *     than penalising a source for not supporting `HEAD`. (Callers that need a
 *     stronger guarantee can re-probe with a ranged `GET`.)
 *   - `4xx` (other than `405`) and `5xx`: unhealthy. The playlist is missing,
 *     forbidden, or the origin is erroring.
 *   - `null` status (network error / timeout / DNS failure): unhealthy.
 *
 * The `ok` flag (true for `2xx`) is accepted so callers can pass the fetch
 * `Response.ok` directly; when `status` is provided it is the authority and
 * `ok` is only used as a fallback when `status` is `null` but a truthy `ok`
 * was somehow supplied.
 */
export function classifyHealth(
  status: number | null,
  ok: boolean,
): HealthClassification {
  if (status === null) {
    // No usable status code. Trust `ok` only if it is explicitly true.
    return { healthy: ok === true, lastStatus: null };
  }

  const healthy =
    (status >= 200 && status < 400) || // 2xx + 3xx
    status === 405; // HEAD unsupported but origin reachable

  return { healthy, lastStatus: status };
}

/**
 * Probe a stream source URL and report its health (IMPURE).
 *
 * Performs a lightweight `HEAD` (or ranged `GET`) request guarded by an
 * `AbortController` timeout and classifies the response via `classifyHealth`.
 * Any thrown error (network failure, abort/timeout, invalid URL) is caught and
 * reported as `{ healthy: false, lastStatus: null }`. The function never
 * throws.
 */
export async function probeSource(
  url: string,
  opts: ProbeOptions = {},
): Promise<HealthProbeResult> {
  const {
    timeoutMs = 10_000,
    method = "HEAD",
    fetchImpl = fetch,
    now = () => new Date(),
  } = opts;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // For a ranged GET we ask only for the first byte so we never download the
  // whole playlist just to check availability.
  const headers: HeadersInit | undefined =
    method === "GET" ? { Range: "bytes=0-0" } : undefined;

  try {
    const response = await fetchImpl(url, {
      method,
      headers,
      redirect: "follow",
      signal: controller.signal,
    });

    const { healthy, lastStatus } = classifyHealth(
      response.status,
      response.ok,
    );

    return { healthy, lastStatus, lastCheckedAt: now() };
  } catch {
    // Network error, DNS failure, abort/timeout, or invalid URL.
    return { healthy: false, lastStatus: null, lastCheckedAt: now() };
  } finally {
    clearTimeout(timer);
  }
}
