/**
 * Stream resolution route handler (Req 1.7, 2.4, 2.6, 21.3).
 *
 * `GET /api/streams/[matchId]` returns the resolved failover playlist for a
 * match: exactly the `legallyPermitted && active` stream sources, ordered by
 * failover `priority` (ascending). The ordering and filtering are delegated to
 * the pure `buildPlaylist` helper so the policy lives in one tested place.
 *
 * Defensive posture: non-permitted or inactive sources are NEVER serialized
 * into the response, even if a future caller passes a query flag. The filter
 * is applied unconditionally via `buildPlaylist`.
 *
 * Runs on the Node.js runtime because it reads from PostgreSQL via Prisma, and
 * is always dynamic (per-request, no caching) so the player sees current
 * health/availability.
 */
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { buildPlaylist, type ResolvedSource } from "@/lib/player/playlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Prisma `StreamType` enum value as stored in the database. */
type PrismaStreamType = "HLS" | "DASH";

/** Row shape selected from `StreamSource` for playlist resolution. */
interface StreamSourceRow {
  id: string;
  streamUrl: string;
  quality: string;
  language: string;
  type: PrismaStreamType;
  priority: number;
  legallyPermitted: boolean;
  active: boolean;
}

/**
 * Map a persisted `StreamSource` row to the player-facing `ResolvedSource`
 * shape. The Prisma `StreamType` enum is uppercase (`HLS`/`DASH`); the player
 * protocol type is lowercase (`hls`/`dash`).
 */
function toResolvedSource(row: StreamSourceRow): ResolvedSource {
  return {
    id: row.id,
    url: row.streamUrl,
    quality: row.quality,
    language: row.language,
    type: row.type === "DASH" ? "dash" : "hls",
    priority: row.priority,
    legallyPermitted: row.legallyPermitted,
    active: row.active,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await context.params;

  if (!matchId) {
    return NextResponse.json(
      { error: "Match id is required." },
      { status: 400 },
    );
  }

  const rows = await prisma.streamSource.findMany({
    where: { matchId },
    select: {
      id: true,
      streamUrl: true,
      quality: true,
      language: true,
      type: true,
      priority: true,
      legallyPermitted: true,
      active: true,
    },
  });

  // No sources configured for this match at all -> 404.
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No streams found for this match.", sources: [] },
      { status: 404 },
    );
  }

  // Filter to permitted + active and order by priority via the pure builder.
  const sources = buildPlaylist(rows.map(toResolvedSource));

  return NextResponse.json({ sources });
}
