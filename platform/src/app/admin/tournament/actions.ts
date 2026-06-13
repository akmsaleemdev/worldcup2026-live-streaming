"use server";

/**
 * Tournament management Server Actions (Req 2.1, 6.3, 6.4, 6.5).
 *
 * CRUD for the tournament-structure entities: `Group`, `KnockoutRound`,
 * `Team`, and `Standing`. Every action follows the shared CMS contract:
 *   1. `authorizeAction("tournament:manage")` re-checks the session/role
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
  requireEnum,
  requireInt,
  requireString,
} from "@/lib/cms/action-helpers";
import { recordAudit } from "@/lib/cms/audit";
import { prisma } from "@/lib/db";

/** The `KnockoutStage` enum values accepted from clients (mirrors Prisma). */
const KNOCKOUT_STAGES = [
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "FINAL",
  "THIRD_PLACE",
] as const;

/** Permission guarding every action in this module. */
const PERMISSION = "tournament:manage" as const;

/** Revalidate admin and public surfaces that depend on tournament data. */
function revalidateTournamentPaths(): void {
  revalidatePath("/admin/tournament");
  revalidatePath("/standings");
  revalidatePath("/bracket");
}

// ---------------------------------------------------------------------------
// Group
// ---------------------------------------------------------------------------

/** Create/update input for a group. */
export interface GroupInput {
  name: string;
}

/** Create a new group. */
export async function createGroup(input: GroupInput) {
  const actor = await authorizeAction(PERMISSION);
  const data = { name: requireString(input.name, "name") };

  const created = await prisma.group.create({ data });

  await recordAudit({
    actorId: actor.id,
    action: "group.create",
    entity: "Group",
    entityId: created.id,
  });

  revalidateTournamentPaths();
  return created;
}

/** Update an existing group by id. */
export async function updateGroup(id: string, input: GroupInput) {
  const actor = await authorizeAction(PERMISSION);
  const groupId = requireString(id, "id");
  const data = { name: requireString(input.name, "name") };

  const updated = await prisma.group.update({ where: { id: groupId }, data });

  await recordAudit({
    actorId: actor.id,
    action: "group.update",
    entity: "Group",
    entityId: updated.id,
  });

  revalidateTournamentPaths();
  return updated;
}

/** Delete a group by id. */
export async function deleteGroup(id: string) {
  const actor = await authorizeAction(PERMISSION);
  const groupId = requireString(id, "id");

  const deleted = await prisma.group.delete({ where: { id: groupId } });

  await recordAudit({
    actorId: actor.id,
    action: "group.delete",
    entity: "Group",
    entityId: deleted.id,
  });

  revalidateTournamentPaths();
  return deleted;
}

// ---------------------------------------------------------------------------
// KnockoutRound
// ---------------------------------------------------------------------------

/** Create/update input for a knockout round. */
export interface KnockoutRoundInput {
  stage: (typeof KNOCKOUT_STAGES)[number];
}

/** Create a new knockout round. */
export async function createKnockoutRound(input: KnockoutRoundInput) {
  const actor = await authorizeAction(PERMISSION);
  const data = { stage: requireEnum(input.stage, KNOCKOUT_STAGES, "stage") };

  const created = await prisma.knockoutRound.create({ data });

  await recordAudit({
    actorId: actor.id,
    action: "knockoutRound.create",
    entity: "KnockoutRound",
    entityId: created.id,
  });

  revalidateTournamentPaths();
  return created;
}

/** Update an existing knockout round by id. */
export async function updateKnockoutRound(
  id: string,
  input: KnockoutRoundInput,
) {
  const actor = await authorizeAction(PERMISSION);
  const roundId = requireString(id, "id");
  const data = { stage: requireEnum(input.stage, KNOCKOUT_STAGES, "stage") };

  const updated = await prisma.knockoutRound.update({
    where: { id: roundId },
    data,
  });

  await recordAudit({
    actorId: actor.id,
    action: "knockoutRound.update",
    entity: "KnockoutRound",
    entityId: updated.id,
  });

  revalidateTournamentPaths();
  return updated;
}

/** Delete a knockout round by id. */
export async function deleteKnockoutRound(id: string) {
  const actor = await authorizeAction(PERMISSION);
  const roundId = requireString(id, "id");

  const deleted = await prisma.knockoutRound.delete({
    where: { id: roundId },
  });

  await recordAudit({
    actorId: actor.id,
    action: "knockoutRound.delete",
    entity: "KnockoutRound",
    entityId: deleted.id,
  });

  revalidateTournamentPaths();
  return deleted;
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

/** Create/update input for a team. */
export interface TeamInput {
  name: string;
  shortName?: string | null;
  logoUrl?: string | null;
  groupId?: string | null;
  coach?: string | null;
  founded?: number | null;
  description?: string | null;
}

/** Validate raw input into the exact column data for a team write. */
function parseTeam(input: TeamInput) {
  return {
    name: requireString(input.name, "name"),
    shortName: optionalString(input.shortName, "shortName"),
    logoUrl: optionalString(input.logoUrl, "logoUrl"),
    groupId: optionalString(input.groupId, "groupId"),
    coach: optionalString(input.coach, "coach"),
    founded: optionalInt(input.founded, "founded"),
    description: optionalString(input.description, "description"),
  };
}

/** Create a new team. */
export async function createTeam(input: TeamInput) {
  const actor = await authorizeAction(PERMISSION);
  const data = parseTeam(input);

  const created = await prisma.team.create({ data });

  await recordAudit({
    actorId: actor.id,
    action: "team.create",
    entity: "Team",
    entityId: created.id,
  });

  revalidateTournamentPaths();
  return created;
}

/** Update an existing team by id. */
export async function updateTeam(id: string, input: TeamInput) {
  const actor = await authorizeAction(PERMISSION);
  const teamId = requireString(id, "id");
  const data = parseTeam(input);

  const updated = await prisma.team.update({ where: { id: teamId }, data });

  await recordAudit({
    actorId: actor.id,
    action: "team.update",
    entity: "Team",
    entityId: updated.id,
  });

  revalidateTournamentPaths();
  return updated;
}

/** Delete a team by id. */
export async function deleteTeam(id: string) {
  const actor = await authorizeAction(PERMISSION);
  const teamId = requireString(id, "id");

  const deleted = await prisma.team.delete({ where: { id: teamId } });

  await recordAudit({
    actorId: actor.id,
    action: "team.delete",
    entity: "Team",
    entityId: deleted.id,
  });

  revalidateTournamentPaths();
  return deleted;
}

// ---------------------------------------------------------------------------
// Standing
// ---------------------------------------------------------------------------

/** Create/update input for a standings row. */
export interface StandingInput {
  teamId: string;
  groupId: string;
  played?: number;
  won?: number;
  drawn?: number;
  lost?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  points?: number;
}

/** Validate raw input into the exact column data for a standing write. */
function parseStanding(input: StandingInput) {
  return {
    teamId: requireString(input.teamId, "teamId"),
    groupId: requireString(input.groupId, "groupId"),
    played: requireInt(input.played, "played", 0),
    won: requireInt(input.won, "won", 0),
    drawn: requireInt(input.drawn, "drawn", 0),
    lost: requireInt(input.lost, "lost", 0),
    goalsFor: requireInt(input.goalsFor, "goalsFor", 0),
    goalsAgainst: requireInt(input.goalsAgainst, "goalsAgainst", 0),
    points: requireInt(input.points, "points", 0),
  };
}

/** Create a new standings row. */
export async function createStanding(input: StandingInput) {
  const actor = await authorizeAction(PERMISSION);
  const data = parseStanding(input);

  const created = await prisma.standing.create({ data });

  await recordAudit({
    actorId: actor.id,
    action: "standing.create",
    entity: "Standing",
    entityId: created.id,
  });

  revalidateTournamentPaths();
  return created;
}

/** Update an existing standings row by id. */
export async function updateStanding(id: string, input: StandingInput) {
  const actor = await authorizeAction(PERMISSION);
  const standingId = requireString(id, "id");
  const data = parseStanding(input);

  const updated = await prisma.standing.update({
    where: { id: standingId },
    data,
  });

  await recordAudit({
    actorId: actor.id,
    action: "standing.update",
    entity: "Standing",
    entityId: updated.id,
  });

  revalidateTournamentPaths();
  return updated;
}

/** Delete a standings row by id. */
export async function deleteStanding(id: string) {
  const actor = await authorizeAction(PERMISSION);
  const standingId = requireString(id, "id");

  const deleted = await prisma.standing.delete({
    where: { id: standingId },
  });

  await recordAudit({
    actorId: actor.id,
    action: "standing.delete",
    entity: "Standing",
    entityId: deleted.id,
  });

  revalidateTournamentPaths();
  return deleted;
}
