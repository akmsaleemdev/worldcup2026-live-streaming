/**
 * Audit log service (Req 6.5).
 *
 * `recordAudit` writes EXACTLY ONE `AuditLog` row carrying the acting user,
 * the action performed, the affected entity, and a timestamp, then returns the
 * created row. Every content-modifying CMS action funnels through this service
 * so that mutations always produce a single audit entry (Property 16).
 *
 * The persistence boundary is injectable via `deps.client` (an object exposing
 * `auditLog.create`) and the clock via `deps.now`. This keeps the service pure
 * with respect to its inputs and lets the property test substitute a mock
 * client to assert that exactly one entry is created — without touching a real
 * database. When no dependencies are supplied, the real singleton Prisma client
 * and the system clock are used.
 */
import type { AuditLog } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Caller-supplied details for an audit entry. */
export interface RecordAuditInput {
  /** The acting user's id, or null/undefined for system/anonymous actions. */
  actorId?: string | null;
  /** The action performed, e.g. "article.create". */
  action: string;
  /** The entity type affected, e.g. "Article". */
  entity: string;
  /** The affected entity's id, when applicable. */
  entityId?: string | null;
}

/** The exact row data written for an audit entry. */
export interface AuditCreateData {
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: Date;
}

/**
 * The minimal persistence boundary `recordAudit` depends on: anything that can
 * create a single `AuditLog` row. The real Prisma client satisfies this, and a
 * test can supply a lightweight mock.
 */
export interface AuditClient {
  auditLog: {
    create(args: { data: AuditCreateData }): Promise<AuditLog>;
  };
}

/** Injectable dependencies for testability. */
export interface RecordAuditDeps {
  /** Persistence boundary; defaults to the real Prisma client. */
  client?: AuditClient;
  /** Clock; defaults to `() => new Date()`. */
  now?: () => Date;
}

/**
 * Record exactly one audit-log entry and return it.
 *
 * Performs a single `auditLog.create` write and no other persistence, so for
 * any authorized content mutation precisely one audit entry is produced
 * (Property 16, Req 6.5).
 */
export async function recordAudit(
  input: RecordAuditInput,
  deps: RecordAuditDeps = {},
): Promise<AuditLog> {
  const client: AuditClient = deps.client ?? (prisma as unknown as AuditClient);
  const now = deps.now ?? (() => new Date());

  return client.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      createdAt: now(),
    },
  });
}
