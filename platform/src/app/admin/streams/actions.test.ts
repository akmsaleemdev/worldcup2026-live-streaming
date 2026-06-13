import { describe, it, expect, vi, beforeEach } from "vitest";

// CRUD round-trip unit tests for the stream-source Server Actions.
//
// _Validates: Requirements 2.1, 6.3, 6.5 (and defense-in-depth Req 6.4)_
//
// These tests exercise the full action contract WITHOUT a database or a real
// session:
//   - `@/lib/db` Prisma client is mocked so create/update/delete return fake
//     rows and every write can be asserted.
//   - `next-auth`'s `getServerSession` is mocked via a mutable holder so each
//     test controls the acting role (defense in depth, Req 6.4).
//   - `next/cache`'s `revalidatePath` is mocked (no Next.js runtime here).
//   - `@/lib/cms/audit`'s `recordAudit` is mocked so we can assert that exactly
//     one audit entry is produced per mutation (Req 6.5).

// Hoisted shared mocks: `vi.mock` factories are hoisted above imports, so any
// state they reference must be created with `vi.hoisted`.
const { sessionRef, prismaMock, recordAuditMock, revalidatePathMock } =
  vi.hoisted(() => ({
    sessionRef: { current: null as unknown },
    prismaMock: {
      streamSource: {
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
  createStreamSource,
  updateStreamSource,
  deleteStreamSource,
  type StreamSourceInput,
} from "./actions";
import { ForbiddenError } from "@/lib/cms/action-helpers";

/** Authorize the next action call as a role holding `stream:manage`. */
function signInAs(role: string, id = "actor-1"): void {
  sessionRef.current = { user: { id, role } };
}

/** Minimal valid create/update input; defaults fill the rest. */
const baseInput: StreamSourceInput = {
  matchId: "match-1",
  sourceName: "Main Feed",
  streamUrl: "https://cdn.example.com/stream.m3u8",
};

/** The exact validated column data `parseStreamSource` yields for `baseInput`. */
const parsedData = {
  matchId: "match-1",
  sourceName: "Main Feed",
  streamUrl: "https://cdn.example.com/stream.m3u8",
  quality: "1080p",
  language: "EN",
  type: "HLS",
  priority: 0,
  active: true,
  legallyPermitted: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionRef.current = null;
  recordAuditMock.mockResolvedValue({ id: "audit-1" });
});

describe("createStreamSource (Req 2.1, 6.3, 6.5)", () => {
  it("performs the Prisma create with validated data and writes exactly one audit entry", async () => {
    signInAs("ADMIN");
    prismaMock.streamSource.create.mockResolvedValue({
      id: "stream-1",
      matchId: "match-1",
    });

    const result = await createStreamSource(baseInput);

    // The Prisma write ran once with the validated column data (Req 2.1, 6.3).
    expect(prismaMock.streamSource.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.streamSource.create).toHaveBeenCalledWith({
      data: parsedData,
    });

    // Exactly one audit entry with the right actor/action/entity (Req 6.5).
    expect(recordAuditMock).toHaveBeenCalledTimes(1);
    expect(recordAuditMock).toHaveBeenCalledWith({
      actorId: "actor-1",
      action: "stream.create",
      entity: "StreamSource",
      entityId: "stream-1",
    });

    expect(result).toEqual({ id: "stream-1", matchId: "match-1" });
  });
});

describe("updateStreamSource (Req 2.1, 6.3, 6.5)", () => {
  it("performs the Prisma update by id with validated data and writes exactly one audit entry", async () => {
    signInAs("SUPER_ADMIN", "actor-2");
    prismaMock.streamSource.update.mockResolvedValue({
      id: "stream-9",
      matchId: "match-7",
    });

    await updateStreamSource("stream-9", baseInput);

    expect(prismaMock.streamSource.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.streamSource.update).toHaveBeenCalledWith({
      where: { id: "stream-9" },
      data: parsedData,
    });

    expect(recordAuditMock).toHaveBeenCalledTimes(1);
    expect(recordAuditMock).toHaveBeenCalledWith({
      actorId: "actor-2",
      action: "stream.update",
      entity: "StreamSource",
      entityId: "stream-9",
    });
  });
});

describe("deleteStreamSource (Req 2.1, 6.3, 6.5)", () => {
  it("performs the Prisma delete by id and writes exactly one audit entry", async () => {
    signInAs("ADMIN");
    prismaMock.streamSource.delete.mockResolvedValue({
      id: "stream-3",
      matchId: "match-2",
    });

    await deleteStreamSource("stream-3");

    expect(prismaMock.streamSource.delete).toHaveBeenCalledTimes(1);
    expect(prismaMock.streamSource.delete).toHaveBeenCalledWith({
      where: { id: "stream-3" },
    });

    expect(recordAuditMock).toHaveBeenCalledTimes(1);
    expect(recordAuditMock).toHaveBeenCalledWith({
      actorId: "actor-1",
      action: "stream.delete",
      entity: "StreamSource",
      entityId: "stream-3",
    });
  });
});

describe("authorization (defense in depth, Req 6.4)", () => {
  it("throws ForbiddenError and performs NO write when an unauthorized role (USER) calls create", async () => {
    signInAs("USER");

    await expect(createStreamSource(baseInput)).rejects.toBeInstanceOf(
      ForbiddenError,
    );

    // No persistence and no audit entry on a denied action.
    expect(prismaMock.streamSource.create).not.toHaveBeenCalled();
    expect(recordAuditMock).not.toHaveBeenCalled();
  });

  it("throws ForbiddenError and performs NO write when an unauthorized role (USER) calls delete", async () => {
    signInAs("USER");

    await expect(deleteStreamSource("stream-3")).rejects.toBeInstanceOf(
      ForbiddenError,
    );

    expect(prismaMock.streamSource.delete).not.toHaveBeenCalled();
    expect(recordAuditMock).not.toHaveBeenCalled();
  });
});
