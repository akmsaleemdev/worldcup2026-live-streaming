import { describe, it, expect, vi } from "vitest";
import { fc } from "../../test/fc";
import { recordAudit, type AuditClient, type AuditCreateData } from "./audit";
import type { AuditLog } from "@prisma/client";

// Neutralize the import-time side effect of the real Prisma singleton: importing
// `audit.ts` pulls in `@/lib/db`, which constructs a `PrismaClient` at module
// load. The test injects its own mock client, so the default singleton is never
// exercised; this stub merely keeps the import from touching a real database.
vi.mock("@/lib/db", () => ({
  prisma: {},
  default: {},
}));

// Feature: worldcup-2026-platform, Property 16: For any content-modifying CMS action invoked by an authorized actor, exactly one audit-log entry is recorded carrying the actor, action, and timestamp.
//
// _Validates: Requirements 6.5_
//
// The persistence boundary (Prisma's `auditLog.create`) is mocked so no real
// database is required. The mock records every invocation and the data it was
// called with, letting the test assert that EXACTLY ONE row is written and that
// the row carries the supplied actor, the supplied action, and a timestamp.

/**
 * Build a mock `AuditClient` whose `auditLog.create` records each call. It
 * returns a synthesized `AuditLog` row echoing the written data so `recordAudit`
 * resolves successfully without a database.
 */
function makeMockClient() {
  const calls: { data: AuditCreateData }[] = [];
  const client: AuditClient = {
    auditLog: {
      create(args: { data: AuditCreateData }): Promise<AuditLog> {
        calls.push(args);
        const row = { id: `audit-${calls.length}`, ...args.data } as AuditLog;
        return Promise.resolve(row);
      },
    },
  };
  return { client, calls };
}

describe("recordAudit (Property 16)", () => {
  it("writes exactly one audit entry carrying the actor, action, and timestamp", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          actorId: fc.option(fc.string(), { nil: undefined }),
          action: fc.string(),
          entity: fc.string(),
          entityId: fc.option(fc.string(), { nil: undefined }),
        }),
        // Arbitrary deterministic clock instant for the injected `now`.
        fc.date({
          min: new Date("2020-01-01T00:00:00.000Z"),
          max: new Date("2030-12-31T23:59:59.999Z"),
        }),
        async (input, instant) => {
          const { client, calls } = makeMockClient();

          await recordAudit(input, { client, now: () => instant });

          // Exactly one audit-log entry is recorded.
          expect(calls).toHaveLength(1);

          const { data } = calls[0];

          // Carries the actor (null when none supplied).
          expect(data.actorId).toBe(input.actorId ?? null);

          // Carries the action.
          expect(data.action).toBe(input.action);

          // Carries a timestamp (the injected instant).
          expect(data.createdAt).toBeInstanceOf(Date);
          expect(data.createdAt.getTime()).toBe(instant.getTime());
        },
      ),
    );
  });
});
