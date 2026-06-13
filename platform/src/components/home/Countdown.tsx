"use client";

import { useEffect, useState } from "react";

/**
 * Live countdown island (Req 10.1).
 *
 * Small client component that ticks once per second toward a configured
 * target date. It is intentionally the only client boundary on the otherwise
 * server-rendered home page: the page passes the resolved target as an ISO
 * string (read from the `countdown_target` setting) so this component owns no
 * data fetching, just the per-second timer.
 *
 * Rendering is hydration-safe: the first client render mirrors the server
 * output (an all-zero, pre-mount snapshot) and the live value is only computed
 * after mount inside `useEffect`, avoiding a server/client text mismatch.
 */

export interface CountdownProps {
  /** ISO-8601 target datetime to count down to. */
  target: string;
  /** Optional label shown once the target has elapsed. */
  reachedLabel?: string;
}

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** True once the target datetime has been reached or passed. */
  done: boolean;
}

const ZERO: Remaining = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  done: false,
};

export function computeRemaining(target: string, now: number): Remaining {
  const targetMs = new Date(target).getTime();
  if (Number.isNaN(targetMs)) {
    return ZERO;
  }
  const diff = targetMs - now;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    done: false,
  };
}

const UNITS: { key: keyof Omit<Remaining, "done">; label: string }[] = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Mins" },
  { key: "seconds", label: "Secs" },
];

export function Countdown({
  target,
  reachedLabel = "The tournament is underway",
}: CountdownProps) {
  // `null` until the client has computed a live value. The server and first
  // client render both fall back to the deterministic ZERO snapshot below, so
  // hydration never mismatches.
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    const update = () => setRemaining(computeRemaining(target, Date.now()));
    // Defer the first computation out of the effect body so state updates only
    // ever happen from timer callbacks, not synchronously during render.
    const initial = window.setTimeout(update, 0);
    const id = window.setInterval(update, 1_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(id);
    };
  }, [target]);

  if (remaining?.done) {
    return (
      <p
        role="status"
        className="inline-flex items-center gap-2 font-orbitron text-lg font-bold text-accent"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
        {reachedLabel}
      </p>
    );
  }

  const display = remaining ?? ZERO;

  return (
    <div
      role="timer"
      aria-label="Countdown to kickoff"
      className="flex gap-3 sm:gap-4"
    >
      {UNITS.map((unit) => (
        <div
          key={unit.key}
          className="glass flex min-w-16 flex-col items-center rounded-lg border border-white/10 px-3 py-2"
        >
          <span className="font-orbitron text-2xl font-black tabular-nums text-foreground-strong sm:text-3xl">
            {String(display[unit.key]).padStart(2, "0")}
          </span>
          <span className="text-[0.65rem] uppercase tracking-widest text-foreground/60">
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default Countdown;
