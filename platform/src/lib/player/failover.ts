/**
 * Failover controller (pure, no DOM/IO).
 *
 * Implements Requirements 1.7 and 1.8: the player tries the resolved playlist
 * sources in order; on a load timeout/error it advances to the next source
 * (`nextSource`), and once no further source exists (`hasNext` is false) the UI
 * renders the explicit "No stream available" error state.
 *
 * The state machine is intentionally immutable: every transition returns a new
 * `FailoverState` and never mutates its input. This keeps the controller free
 * of side effects so it can be unit- and property-tested in isolation
 * (Property 2). The `ResolvedSource` type is imported (type-only) from
 * `./playlist`, which produces the ordered, permitted playlist consumed here.
 */

import type { ResolvedSource } from "./playlist";

/**
 * Failover state machine.
 *
 * `sources` is the resolved, ordered playlist (already filtered/sorted by
 * `buildPlaylist`). `index` points at the source currently being attempted.
 * A valid in-range `index` is `0 .. sources.length - 1`; advancing past the
 * last source yields `index === sources.length` (exhausted).
 */
export interface FailoverState {
  sources: ResolvedSource[];
  index: number;
}

/**
 * Create the initial failover state positioned at the first source.
 *
 * The provided `sources` array is referenced as-is (not copied); callers should
 * pass the immutable playlist produced by `buildPlaylist`. For an empty
 * playlist, `index` is still 0 and `hasNext`/`currentSource` will reflect that
 * there is nothing to play.
 */
export function initFailover(sources: ResolvedSource[]): FailoverState {
  return { sources, index: 0 };
}

/**
 * The source currently being attempted, or `undefined` when `index` is out of
 * range (e.g. the playlist is empty or all sources have been exhausted).
 */
export function currentSource(state: FailoverState): ResolvedSource | undefined {
  return state.sources[state.index];
}

/**
 * Whether a source exists *after* the current `index`.
 *
 * Semantics: `hasNext(state) === (state.index + 1 < state.sources.length)`.
 * It answers "is there a source to fail over to from the current position",
 * which is exactly the trigger for Req 1.8 — when this returns false there is
 * no further source to try and the player shows "No stream available".
 */
export function hasNext(state: FailoverState): boolean {
  return state.index + 1 < state.sources.length;
}

/**
 * Advance to the next source on failure of the current one (Req 1.7).
 *
 * Returns a new state with `index` incremented by 1; the input state is never
 * mutated and `sources` is carried over by reference (it is immutable). Calling
 * `nextSource` repeatedly walks the playlist strictly in order without
 * repetition; once `index` reaches `sources.length` the playlist is exhausted
 * and `hasNext` is (and stays) false.
 */
export function nextSource(state: FailoverState): FailoverState {
  return { sources: state.sources, index: state.index + 1 };
}
