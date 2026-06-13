"use server";

/**
 * Match management Server Actions (Req 2.1, 6.3, 6.4, 6.5).
 *
 * CRUD for `Match`. Every action follows the shared CMS contract:
 *   1. `authorizeAction("match:manage")` re-checks the session/role
 *      server-side (defense in depth, Req 6.4).
 *   2. Inputs are validated, then the Prisma write runs (Req 6.3).
 *   3. Exactly one audit entry is recorded via `recordAudit` (Req 6.5).
 * Affected admin/public paths are revalidated after each mutation.
 */
import { revalidatePath } from "next/cache";

import {
  authorizeAction,
  optionalInt,
  optionalString,
  requireDate,
  requireEnum,
  requireString,
} from "@/lib/cms/action-helpers";
import { recordAudit } from "@/lib/cms/audit";
import { prisma } from "@/lib/db";

/** The `MatchStatus` enum values accepted from clients (mirrors Prisma). */
const MATCH_STATUSES = ["UPCOMING", "LIVE", "COMPLETED", "POSTPONED"] as const;

/** Permission guarding every action in this module. */
const PERMISSION = "match:manage" as const;

/** Audit `entity` label for match mutations. */
const ENTITY = "Match";

/** Create/update input for a match. */
export interface MatchInput {
  homeTeamId: string;
  awayTeamId: string;
  matchDate: Date | string | number;
  status?: (typeof MATCH_STATUSES)[number];
  homeScore?: number | null;
  awayScore?: number | null;
  stadium?: string | null;
  venue?: string | null;
  weather?: string | null;
  referee?: string | null;
  stage?: string | null;
  knockoutRoundId?: string | null;
}

/** Revalidate admin and public surfaces that depend on match data. */
function revalidateMatchPaths(matchId: string): void {
  revalidatePath("/admin/matches");
  revalidatePath("/matches");
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/standings");
  revalidatePath("/bracket");
}

/** Validate raw input into the exact column data for a match write. */
function parseMatch(input: MatchInput) {
  const homeTeamId = requireString(input.homeTeamId, "homeTeamId");
  const awayTeamId = requireString(input.awayTeamId, "awayTeamId");

  return {
    homeTeamId,
    awayTeamId,
    matchDate: requireDate(input.matchDate, "matchDate"),
    status: requireEnum(input.status ?? "UPCOMING", MATCH_STATUSES, "status"),
    homeScore: optionalInt(input.homeScore, "homeScore"),
    awayScore: optionalInt(input.awayScore, "awayScore"),
    stadium: optionalString(input.stadium, "stadium"),
    venue: optionalString(input.venue, "venue"),
    weather: optionalString(input.weather, "weather"),
    referee: optionalString(input.referee, "referee"),
    stage: optionalString(input.stage, "stage"),
    knockoutRoundId: optionalString(input.knockoutRoundId, "knockoutRoundId"),
  };
}

/** Create a new match. */
export async function createMatch(input: MatchInput) {
  const actor = await authorizeAction(PERMISSION);
  const data = parseMatch(input);

  const created = await prisma.match.create({ data });

  await recordAudit({
    actorId: actor.id,
    action: "match.create",
    entity: ENTITY,
    entityId: created.id,
  });

  revalidateMatchPaths(created.id);
  return created;
}

/** Update an existing match by id. */
export async function updateMatch(id: string, input: MatchInput) {
  const actor = await authorizeAction(PERMISSION);
  const matchId = requireString(id, "id");
  const data = parseMatch(input);

  const updated = await prisma.match.update({
    where: { id: matchId },
    data,
  });

  await recordAudit({
    actorId: actor.id,
    action: "match.update",
    entity: ENTITY,
    entityId: updated.id,
  });

  revalidateMatchPaths(updated.id);
  return updated;
}

/** Delete a match by id. */
export async function deleteMatch(id: string) {
  const actor = await authorizeAction(PERMISSION);
  const matchId = requireString(id, "id");

  const deleted = await prisma.match.delete({
    where: { id: matchId },
  });

  await recordAudit({
    actorId: actor.id,
    action: "match.delete",
    entity: ENTITY,
    entityId: deleted.id,
  });

  revalidateMatchPaths(deleted.id);
  return deleted;
}
