import { computeStandings, type CompletedMatch } from "@/lib/match/standings";

/**
 * Group standings table (Req 3.3).
 *
 * Server component. Computes played / won / drawn / lost / goals-for /
 * goals-against / points per team from completed matches via the pure
 * `computeStandings` helper and renders an accessible table. Team names are
 * resolved from the supplied `teamNames` map, falling back to the team id.
 */

export interface StandingsTableProps {
  /** Group/section label rendered as the table caption. */
  groupName: string;
  /** Completed matches used to derive the table. */
  matches: CompletedMatch[];
  /** Team ids to seed so teams with no matches still appear. */
  teamIds?: string[];
  /** Map of teamId -> display name. */
  teamNames: Record<string, string>;
}

const COLUMNS: { key: string; label: string; title: string }[] = [
  { key: "played", label: "P", title: "Played" },
  { key: "won", label: "W", title: "Won" },
  { key: "drawn", label: "D", title: "Drawn" },
  { key: "lost", label: "L", title: "Lost" },
  { key: "goalsFor", label: "GF", title: "Goals For" },
  { key: "goalsAgainst", label: "GA", title: "Goals Against" },
  { key: "points", label: "Pts", title: "Points" },
];

export function StandingsTable({
  groupName,
  matches,
  teamIds,
  teamNames,
}: StandingsTableProps) {
  const rows = computeStandings(matches, teamIds);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 p-6">
        <h3 className="mb-2 font-orbitron font-bold text-foreground-strong">
          {groupName}
        </h3>
        <p className="text-sm text-foreground/60">
          No standings available for this group yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full border-collapse text-sm">
        <caption className="bg-surface/60 px-4 py-3 text-left font-orbitron font-bold text-foreground-strong">
          {groupName}
        </caption>
        <thead>
          <tr className="border-b border-white/10 text-foreground/60">
            <th scope="col" className="px-4 py-2 text-left font-medium">
              Team
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="px-3 py-2 text-right font-medium"
                title={col.title}
              >
                <abbr title={col.title} className="no-underline">
                  {col.label}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.teamId}
              className="border-b border-white/5 last:border-0"
            >
              <th
                scope="row"
                className="px-4 py-2 text-left font-medium text-foreground-strong"
              >
                <span className="mr-2 text-foreground/40 tabular-nums">
                  {index + 1}
                </span>
                {teamNames[row.teamId] ?? row.teamId}
              </th>
              <td className="px-3 py-2 text-right tabular-nums">{row.played}</td>
              <td className="px-3 py-2 text-right tabular-nums">{row.won}</td>
              <td className="px-3 py-2 text-right tabular-nums">{row.drawn}</td>
              <td className="px-3 py-2 text-right tabular-nums">{row.lost}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {row.goalsFor}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {row.goalsAgainst}
              </td>
              <td className="px-3 py-2 text-right font-bold text-accent tabular-nums">
                {row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StandingsTable;
