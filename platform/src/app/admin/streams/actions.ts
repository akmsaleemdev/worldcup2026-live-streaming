"use server";

/**
 * Stream source management Server Actions (Req 2.1, 6.3, 6.4, 6.5).
 *
 * CRUD for `StreamSource`. Every action follows the shared CMS contract:
 *   1. `authorizeAction("stream:manage")` re-checks the session/role
 *      server-side (defense in depth, Req 6.4).
 *   2. Inputs are validated, then the Prisma write runs (Req 2.1, 6.3).
 *   3. Exactly one audit entry is recorded via `recordAudit` (Req 6.5).
 * Affected admin/public paths are revalidated after each mutation.
 */
import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/cms/audit";
import {
  authorizeAction,
  coerceBoolean,
  optionalString,
  requireEnum,
  requireInt,
  requireString,
} from "@/lib/cms/action-helpers";
import { prisma } from "@/lib/db";

/** The `StreamType` enum values accepted from clients (mirrors Prisma). */
const STREAM_TYPES = ["HLS", "DASH"] as const;

/** Permission guarding every action in this module. */
const PERMISSION = "stream:manage" as const;

/** Audit `entity` label for stream-source mutations. */
const ENTITY = "StreamSource";

/** Create/update input for a stream source. */
export interface StreamSourceInput {
  matchId: string;
  sourceName: string;
  streamUrl: string;
  quality?: string;
  language?: string;
  type?: (typeof STREAM_TYPES)[number];
  priority?: number;
  active?: boolean;
  legallyPermitted?: boolean;
}

/** Revalidate the admin stream console and the public match page it feeds. */
function revalidateStreamPaths(matchId: string): void {
  revalidatePath("/admin/streams");
  revalidatePath(`/matches/${matchId}`);
}

/** Validate raw input into the exact column data for a stream source write. */
function parseStreamSource(input: StreamSourceInput) {
  return {
    matchId: requireString(input.matchId, "matchId"),
    sourceName: requireString(input.sourceName, "sourceName"),
    streamUrl: requireString(input.streamUrl, "streamUrl"),
    quality: optionalString(input.quality, "quality") ?? "1080p",
    language: optionalString(input.language, "language") ?? "EN",
    type: requireEnum(input.type ?? "HLS", STREAM_TYPES, "type"),
    priority: requireInt(input.priority, "priority", 0),
    active: coerceBoolean(input.active, true),
    legallyPermitted: coerceBoolean(input.legallyPermitted, false),
  };
}

/** Create a new stream source. */
export async function createStreamSource(input: StreamSourceInput) {
  const actor = await authorizeAction(PERMISSION);
  const data = parseStreamSource(input);

  const created = await prisma.streamSource.create({ data });

  await recordAudit({
    actorId: actor.id,
    action: "stream.create",
    entity: ENTITY,
    entityId: created.id,
  });

  revalidateStreamPaths(created.matchId);
  return created;
}

/** Update an existing stream source by id. */
export async function updateStreamSource(id: string, input: StreamSourceInput) {
  const actor = await authorizeAction(PERMISSION);
  const sourceId = requireString(id, "id");
  const data = parseStreamSource(input);

  const updated = await prisma.streamSource.update({
    where: { id: sourceId },
    data,
  });

  await recordAudit({
    actorId: actor.id,
    action: "stream.update",
    entity: ENTITY,
    entityId: updated.id,
  });

  revalidateStreamPaths(updated.matchId);
  return updated;
}

/** Delete a stream source by id. */
export async function deleteStreamSource(id: string) {
  const actor = await authorizeAction(PERMISSION);
  const sourceId = requireString(id, "id");

  const deleted = await prisma.streamSource.delete({
    where: { id: sourceId },
  });

  await recordAudit({
    actorId: actor.id,
    action: "stream.delete",
    entity: ENTITY,
    entityId: deleted.id,
  });

  revalidateStreamPaths(deleted.matchId);
  return deleted;
}
