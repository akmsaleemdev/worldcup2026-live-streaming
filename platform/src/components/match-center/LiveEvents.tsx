"use client";

import { useCallback, useEffect, useState } from "react";
import { orderEvents } from "@/lib/match/events";

/**
 * Live match events feed (Req 3.6).
 *
 * Client island. While a match is live it polls the match events endpoint on a
 * fixed interval and renders the events in non-decreasing-by-minute order via
 * the pure `orderEvents` helper. When the match is not live it renders the
 * initial events once without polling. An explicit empty state is shown when
 * there are no events.
 */

export interface LiveEvent {
  id: string;
  minute: number;
  type: string;
  description: string;
}

interface LiveEventsProps {
  matchId: string;
  /** Server-rendered initial events so the first paint is populated. */
  initialEvents: LiveEvent[];
  /** Whether the match is live; controls whether polling is active. */
  isLive: boolean;
  /** Poll interval in milliseconds (defaults to 15s). */
  pollIntervalMs?: number;
}

export function LiveEvents({
  matchId,
  initialEvents,
  isLive,
  pollIntervalMs = 15000,
}: LiveEventsProps) {
  const [events, setEvents] = useState<LiveEvent[]>(() =>
    orderEvents(initialEvents),
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}/events`, {
        cache: "no-store",
      });
      if (!res.ok) {
        return;
      }
      const data: { events?: LiveEvent[] } = await res.json();
      if (Array.isArray(data.events)) {
        setEvents(orderEvents(data.events));
      }
    } catch {
      // Network hiccups are non-fatal; keep the last known events on screen.
    }
  }, [matchId]);

  useEffect(() => {
    if (!isLive) {
      return;
    }
    const timer = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(timer);
  }, [isLive, pollIntervalMs, refresh]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h3 className="font-orbitron text-lg font-bold text-foreground-strong">
          Match Events
        </h3>
        {isLive ? (
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold text-danger"
            aria-live="polite"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
            Live
          </span>
        ) : null}
      </div>
      {events.length > 0 ? (
        <ol className="space-y-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-start gap-3 rounded-lg border border-white/10 bg-surface/40 p-3"
            >
              <span className="min-w-10 font-orbitron text-sm font-bold text-accent tabular-nums">
                {event.minute}&apos;
              </span>
              <span className="text-sm">
                <span className="mr-2 rounded bg-white/10 px-1.5 py-0.5 text-xs uppercase tracking-wide text-foreground/70">
                  {event.type}
                </span>
                {event.description}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-lg border border-dashed border-white/10 p-6 text-sm text-foreground/60">
          No events recorded yet.
        </p>
      )}
    </div>
  );
}

export default LiveEvents;
