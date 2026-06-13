/**
 * Stream source management console (Req 2.1, 2.2, 2.4, 2.5, 2.6, 21.3).
 *
 * Server component. Loads every `StreamSource` (with its match + teams) and
 * the set of matches available for assignment, serializes them to plain
 * objects, and hands them to the `StreamManager` client island which renders
 * the grouped table, CRUD form, and on-demand health probes.
 *
 * Always dynamic: the admin needs the freshest persisted health verdict and
 * mutations call `router.refresh()` to re-read this page.
 */
import { prisma } from "@/lib/db";

import {
  StreamManager,
  type MatchOption,
  type StreamSourceRow,
} from "./StreamManager";

export const dynamic = "force-dynamic";

/** Team selection shared by the match-label query fragments. */
const teamSelect = { select: { name: true, shortName: true } } as const;

interface TeamLabel {
  name: string;
  shortName: string | null;
}

/** Build a compact "Home vs Away" label, preferring short names. */
function matchLabel(
  home: TeamLabel | null | undefined,
  away: TeamLabel | null | undefined,
): string {
  const homeName = home?.shortName ?? home?.name ?? "TBD";
  const awayName = away?.shortName ?? away?.name ?? "TBD";
  return `${homeName} vs ${awayName}`;
}

export default async function StreamsAdminPage() {
  const [sources, matches] = await Promise.all([
    prisma.streamSource.findMany({
      orderBy: [{ matchId: "asc" }, { priority: "asc" }],
      include: {
        match: {
          include: { homeTeam: teamSelect, awayTeam: teamSelect },
        },
      },
    }),
    prisma.match.findMany({
      orderBy: { matchDate: "asc" },
      include: { homeTeam: teamSelect, awayTeam: teamSelect },
    }),
  ]);

  const matchOptions: MatchOption[] = matches.map((m) => ({
    id: m.id,
    label: matchLabel(m.homeTeam, m.awayTeam),
  }));

  const labelById = new Map(matchOptions.map((o) => [o.id, o.label]));

  const rows: StreamSourceRow[] = sources.map((s) => ({
    id: s.id,
    matchId: s.matchId,
    matchLabel: s.match
      ? matchLabel(s.match.homeTeam, s.match.awayTeam)
      : (labelById.get(s.matchId) ?? "Unknown match"),
    sourceName: s.sourceName,
    streamUrl: s.streamUrl,
    quality: s.quality,
    language: s.language,
    type: s.type,
    priority: s.priority,
    active: s.active,
    legallyPermitted: s.legallyPermitted,
    healthy: s.healthy,
    lastStatus: s.lastStatus,
    lastCheckedAt: s.lastCheckedAt ? s.lastCheckedAt.toISOString() : null,
  }));

  return <StreamManager rows={rows} matchOptions={matchOptions} />;
}
