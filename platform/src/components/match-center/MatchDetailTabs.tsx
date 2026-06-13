"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * Match detail tabs (Req 3.2).
 *
 * Client island providing the accessible tabbed interface for a match detail
 * page: Overview, Summary, Lineups, Formations, Venue, Weather, and Referee.
 * Tab panels are supplied by the server page as children keyed by tab id, so
 * data fetching stays on the server while only the tab interaction is client
 * side. Implements the WAI-ARIA tabs pattern (roles, aria-selected, keyboard
 * arrow navigation).
 */

export type MatchTabId =
  | "overview"
  | "summary"
  | "lineups"
  | "formations"
  | "venue"
  | "weather"
  | "referee";

const TAB_ORDER: { id: MatchTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "summary", label: "Summary" },
  { id: "lineups", label: "Lineups" },
  { id: "formations", label: "Formations" },
  { id: "venue", label: "Venue" },
  { id: "weather", label: "Weather" },
  { id: "referee", label: "Referee" },
];

export function MatchDetailTabs({
  panels,
}: {
  /** Panel content keyed by tab id. Missing keys render an empty state. */
  panels: Partial<Record<MatchTabId, ReactNode>>;
}) {
  const [active, setActive] = useState<MatchTabId>("overview");
  const baseId = useId();

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
      return;
    }
    event.preventDefault();
    const dir = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + dir + TAB_ORDER.length) % TAB_ORDER.length;
    setActive(TAB_ORDER[next].id);
    document.getElementById(`${baseId}-tab-${TAB_ORDER[next].id}`)?.focus();
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Match details"
        className="flex flex-wrap gap-2 border-b border-white/10"
      >
        {TAB_ORDER.map((tab, index) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              id={`${baseId}-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                selected
                  ? "border-b-2 border-accent text-accent"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {TAB_ORDER.map((tab) => (
        <div
          key={tab.id}
          id={`${baseId}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
          className="py-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {panels[tab.id] ?? (
            <p className="text-sm text-foreground/60">
              No {tab.label.toLowerCase()} information available yet.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default MatchDetailTabs;
