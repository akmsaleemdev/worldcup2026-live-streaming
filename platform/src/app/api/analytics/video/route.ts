/**
 * Video-view analytics route handler (Req 14.3).
 *
 * `POST /api/analytics/video` records a `video_view` `AnalyticsEvent` when a
 * stream begins playback. The client (the Streaming_Player) also forwards the
 * event to GA4 directly; this endpoint persists a first-party copy so the
 * platform retains its own analytics independent of any external service.
 *
 * Best-effort contract: the player must never be blocked by analytics. This
 * handler validates loosely, swallows persistence failures, and always returns
 * a 2xx so a failed insert can never surface as a playback error. Rate limiting
 * for `/api/analytics/*` is applied in `middleware.ts` (Req 19.4).
 *
 * Runs on the Node.js runtime (writes to PostgreSQL via Prisma).
 */
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Accepted POST body for a video-view event. */
interface VideoViewBody {
  /** Match whose stream was viewed. */
  matchId?: string;
  /** Identifier of the source that started playing, when known. */
  sourceId?: string;
  /** Page path the playback occurred on, when known. */
  path?: string;
  /** Whether the match was live at view time. */
  live?: boolean;
}

/** Parse the JSON body, tolerating empty/invalid input. */
async function parseBody(request: Request): Promise<VideoViewBody> {
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
  return {
    matchId: typeof body.matchId === "string" ? body.matchId : undefined,
    sourceId: typeof body.sourceId === "string" ? body.sourceId : undefined,
    path: typeof body.path === "string" ? body.path : undefined,
    live: typeof body.live === "boolean" ? body.live : undefined,
  };
}

export async function POST(request: Request) {
  const { matchId, sourceId, path, live } = await parseBody(request);

  // A video-view event must reference a match; without one we acknowledge but
  // do not record (keeps the analytics table clean without erroring the player).
  if (!matchId) {
    return NextResponse.json(
      { recorded: false, reason: "matchId is required." },
      { status: 202 },
    );
  }

  try {
    await prisma.analyticsEvent.create({
      data: {
        name: "video_view",
        path: path ?? null,
        matchId,
        meta: {
          sourceId: sourceId ?? null,
          live: live ?? null,
        },
      },
    });
    return NextResponse.json({ recorded: true }, { status: 201 });
  } catch {
    // Swallow persistence failures: analytics must never block playback.
    return NextResponse.json({ recorded: false }, { status: 202 });
  }
}
