/**
 * Match event ordering (pure, no IO).
 *
 * Implements Requirement 3.6: while a match is live, the Match_Center displays
 * real-time match events ordered by minute. This module exposes a single pure
 * helper, `orderEvents`, that the `LiveEvents` client island uses to render
 * events in a stable, non-decreasing-by-minute order.
 *
 * The function is intentionally self-contained and free of side effects so it
 * can be unit- and property-tested in isolation (Correctness Property 5).
 */

/**
 * Minimal structural contract for an orderable match event.
 *
 * Only `minute` is required for ordering; any additional fields are preserved
 * untouched. Concrete event records (goals, cards, substitutions, etc.) satisfy
 * this contract by carrying a numeric `minute`.
 */
export interface OrderableEvent {
  minute: number;
  [key: string]: unknown;
}

/**
 * Return a NEW array containing the same events as the input, sorted in
 * non-decreasing order by `minute`.
 *
 * The sort is stable: events sharing the same `minute` retain their relative
 * input order. The input array is never mutated, and the result is always a
 * permutation of the input (same multiset of elements).
 */
export function orderEvents<T extends { minute: number }>(events: T[]): T[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => a.event.minute - b.event.minute || a.index - b.index)
    .map(({ event }) => event);
}
