/**
 * Stream health route handler (Req 2.3, 2.5).
 *
 * `POST /api/streams/health` triggers on-demand health probes for a set of
 * stream sources and persists the verdict (`healthy`, `lastStatus`,
 * `lastCheckedAt`) back onto each `StreamSource`. Source selection:
 *
 *   - `{ sourceIds: [...] }` — probe exactly those sources.
 *   - `{ matchId: "..." }`   — probe all active sources for that match.
 *   - `{}` (default)         — probe all active sources.
 *
 * `GET /api/streams/health[?matchId=...]` returns the current persisted health
 * snapshot without probing (Req 2.5), so the admin UI can render status
 * cheaply between probe runs.
 *
 * Probing performs outbound network requests, so this runs on the Node.js
 * runtime and is always dynamic.
 */
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { probeSource } from "@/lib/player/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Accepted POST body for triggering probes. */
interface HealthProbeRequestBody {
  sourceIds?: string[];
  matchId?: string;
}

/** Per-source probe outcome returned in the POST summary. */
interface ProbeResultSummary {
  id: string;
  sourceName: string;
  matchId: string;
  healthy: boolean;
  lastStatus: number | null;
  lastCheckedAt: string;
}

/**
 * Parse and validate the POST body, tolerating an empty/invalid body by
 * falling back to the default (all active sources).
 */
async function parseBody(request: Request): Promise<HealthProbeRequestBody> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {};
  }

  if (typeof raw !== "object" || raw === null) {
    return {};
  }

  const body = raw as Record<string, unknown>;
  const result: HealthProbeRequestBody = {};

  if (
    Array.isArray(body.sourceIds) &&
    body.sourceIds.every((id) => typeof id === "string")
  ) {
    result.sourceIds = body.sourceIds as string[];
  }

  if (typeof body.matchId === "string" && body.matchId.length > 0) {
    result.matchId = body.matchId;
  }

  return result;
}

export async function POST(request: Request) {
  const { sourceIds, matchId } = await parseBody(request);

  // Build the selection. Explicit ids take precedence; then match scoping;
  // otherwise default to every active source.
  const where =
    sourceIds && sourceIds.length > 0
      ? { id: { in: sourceIds } }
      : matchId
        ? { matchId, active: true }
        : { active: true };

  const sources = await prisma.streamSource.findMany({
    where,
    select: { id: true, sourceName: true, matchId: true, streamUrl: true },
  });

  const results: ProbeResultSummary[] = await Promise.all(
    sources.map(async (source) => {
      const { healthy, lastStatus, lastCheckedAt } = await probeSource(
        source.streamUrl,
      );

      await prisma.streamSource.update({
        where: { id: source.id },
        data: { healthy, lastStatus, lastCheckedAt },
      });

      return {
        id: source.id,
        sourceName: source.sourceName,
        matchId: source.matchId,
        healthy,
        lastStatus,
        lastCheckedAt: lastCheckedAt.toISOString(),
      };
    }),
  );

  const healthyCount = results.filter((r) => r.healthy).length;

  return NextResponse.json({
    probed: results.length,
    healthy: healthyCount,
    unhealthy: results.length - healthyCount,
    results,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");

  const sources = await prisma.streamSource.findMany({
    where: matchId ? { matchId } : undefined,
    orderBy: [{ matchId: "asc" }, { priority: "asc" }],
    select: {
      id: true,
      sourceName: true,
      matchId: true,
      healthy: true,
      lastStatus: true,
      lastCheckedAt: true,
      active: true,
      legallyPermitted: true,
    },
  });

  return NextResponse.json({
    sources: sources.map((s) => ({
      id: s.id,
      sourceName: s.sourceName,
      matchId: s.matchId,
      healthy: s.healthy,
      lastStatus: s.lastStatus,
      lastCheckedAt: s.lastCheckedAt ? s.lastCheckedAt.toISOString() : null,
      active: s.active,
      legallyPermitted: s.legallyPermitted,
    })),
  });
}
