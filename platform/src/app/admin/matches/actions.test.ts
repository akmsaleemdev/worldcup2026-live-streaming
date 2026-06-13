import { describe, it, expect, vi, beforeEach } from "vitest";

// CRUD round-trip unit tests for the match Server Actions.
//
// _Validates: Requirements 2.1, 6.3, 6.5 (and defense-in-depth Req 6.4)_
//
// Mirrors the stream-action tests: the Prisma client, session, cache
// revalidation, and audit service are mocked so the full action contract is
// exercised without a database or a real session. We assert each mutation
// performs the validated Prisma write AND produces exactly one audit entry, and
// that an unauthorized role is denied before any write.

const { sessionRef, prismaMock, recordAuditMock, revalidatePathMock } =
  vi.hoisted(() => ({
    sessionRef: { current: null as unknown },
    prismaMock: {
      match: {
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
    recordAuditMock: vi.fn(),
    revalidatePathMock: vi.fn(),
  }));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => sessionRef.current),
}));
vi.mock("@/lib/db", () => ({ prisma: prismaMock, default: prismaMock }));
vi.mock("@/lib/cms/audit", () => ({ recordAudit: recordAuditMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

import {
  createMatch,
  updateMatch,
  deleteMatch,
  type MatchInput,
} from "./actions";
import { ForbiddenError } from "@/lib/cms/action-helpers";

/** Authorize the next action call as a role holding `match:manage`. */
function signInAs(role: string, id = "actor-1"): void {
  sessionRef.current = { user: { id, role } };
}

const matchDate = new Date("2026-06-11T18:00:00.000Z");

/** Minimal valid create/update input; defaults fill the rest. */
const baseInput: MatchInput = {
  homeTeamId: "home-1",
  awayTeamId: "away-1",
  matchDate,
};

/** The exact validated column data `parseMatch` yields for `baseInput`. */
const parsedData = {
  homeTeamId: "home-1",
  awayTeamId: "away-1",
  matchDate,
  status: "UPCOMING",
  homeScore: null,
  awayScore: null,
  stadium: null,
  venue: null,
  weather: null,
  referee: null,
  stage: null,
  knockoutRoundId: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionRef.current = null;
  recordAuditMock.mockResolvedValue({ id: "audit-1" });
});

describe("createMatch (Req 2.1, 6.3, 6.5)", () => {
  it("performs the Prisma create with validated data and writes exactly one audit entry", async () => {
    signInAs("ADMIN");
    prismaMock.match.create.mockResolvedValue({ id: "match-1" });

    const result = await createMatch(baseInput);

    expect(prismaMock.match.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.match.create).toHaveBeenCalledWith({ data: parsedData });

    expect(recordAuditMock).toHaveBeenCalledTimes(1);
    expect(recordAuditMock).toHaveBeenCalledWith({
      actorId: "actor-1",
      action: "match.create",
      entity: "Match",
      entityId: "match-1",
    });

    expect(result).toEqual({ id: "match-1" });
  });
});

describe("updateMatch (Req 2.1, 6.3, 6.5)", () => {
  it("performs the Prisma update by id with validated data and writes exactly one audit entry", async () => {
    signInAs("SUPER_ADMIN", "actor-2");
    prismaMock.match.update.mockResolvedValue({ id: "match-9" });

    await updateMatch("match-9", baseInput);

    expect(prismaMock.match.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.match.update).toHaveBeenCalledWith({
      where: { id: "match-9" },
      data: parsedData,
    });

    expect(recordAuditMock).toHaveBeenCalledTimes(1);
    expect(recordAuditMock).toHaveBeenCalledWith({
      actorId: "actor-2",
      action: "match.update",
      entity: "Match",
      entityId: "match-9",
    });
  });
});

describe("deleteMatch (Req 2.1, 6.3, 6.5)", () => {
  it("performs the Prisma delete by id and writes exactly one audit entry", async () => {
    signInAs("ADMIN");
    prismaMock.match.delete.mockResolvedValue({ id: "match-3" });

    await deleteMatch("match-3");

    expect(prismaMock.match.delete).toHaveBeenCalledTimes(1);
    expect(prismaMock.match.delete).toHaveBeenCalledWith({
      where: { id: "match-3" },
    });

    expect(recordAuditMock).toHaveBeenCalledTimes(1);
    expect(recordAuditMock).toHaveBeenCalledWith({
      actorId: "actor-1",
      action: "match.delete",
      entity: "Match",
      entityId: "match-3",
    });
  });
});

describe("authorization (defense in depth, Req 6.4)", () => {
  it("throws ForbiddenError and performs NO write when an unauthorized role (USER) calls create", async () => {
    signInAs("USER");

    await expect(createMatch(baseInput)).rejects.toBeInstanceOf(ForbiddenError);

    expect(prismaMock.match.create).not.toHaveBeenCalled();
    expect(recordAuditMock).not.toHaveBeenCalled();
  });

  it("throws ForbiddenError and performs NO write when an unauthorized role (USER) calls delete", async () => {
    signInAs("USER");

    await expect(deleteMatch("match-3")).rejects.toBeInstanceOf(ForbiddenError);

    expect(prismaMock.match.delete).not.toHaveBeenCalled();
    expect(recordAuditMock).not.toHaveBeenCalled();
  });
});
