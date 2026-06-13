/**
 * Failover playlist builder (pure, no IO).
 *
 * Implements Requirements 2.4, 2.6, and 21.3: the player is served only the
 * stream sources that are legally permitted and active, ordered by their
 * failover `priority`. The resolved playlist is consumed by the failover
 * controller (`failover.ts`) and the stream-resolution API route.
 *
 * This module is intentionally self-contained and free of side effects so it
 * can be unit- and property-tested in isolation. The `StreamType` and
 * `ResolvedSource` types are defined here (consistent with the Prisma
 * `StreamType` enum and the `StreamSource` model); a later task may reconcile
 * them into a single shared type.
 */

/** Streaming protocol of a resolved source. */
export type StreamType = "hls" | "dash";

/**
 * A stream source resolved for playback/failover.
 *
 * `priority` defines the ordered failover sequence (lower values are tried
 * earlier). `legallyPermitted` and `active` together gate whether a source is
 * ever served (Req 2.6, 21.3).
 */
export interface ResolvedSource {
  id: string;
  url: string;
  quality: string; // "1080p" | "720p" | "auto" ...
  language: string; // ISO-ish code, e.g. "EN", "FR"
  type: StreamType;
  priority: number; // ordered failover sequence (lower = earlier)
  legallyPermitted: boolean;
  active: boolean;
}

/**
 * Build the resolved failover playlist for a match.
 *
 * Returns exactly the sources where `legallyPermitted === true` and
 * `active === true`, sorted by `priority` in non-decreasing order. The sort is
 * stable: sources with equal `priority` retain their relative input order. The
 * input array is never mutated.
 */
export function buildPlaylist(sources: ResolvedSource[]): ResolvedSource[] {
  return sources
    .filter((source) => source.legallyPermitted && source.active)
    .map((source, index) => ({ source, index }))
    .sort((a, b) => a.source.priority - b.source.priority || a.index - b.index)
    .map(({ source }) => source);
}
