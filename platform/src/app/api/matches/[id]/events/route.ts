import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { orderEvents } from "@/lib/match/events";

/**
 * Match events endpoint (Req 3.6).
 *
 * Returns the events for a match ordered non-decreasing by minute via the pure
 * `orderEvents` helper. Consumed by the `LiveEvents` client island for
 * interval refresh while a match is live. Always returns a 200 with an
 * `events` array (empty when the match has no events).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const events = await prisma.matchEvent.findMany({
    where: { matchId: id },
    select: { id: true, minute: true, type: true, description: true },
  });

  return NextResponse.json(
    { events: orderEvents(events) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
