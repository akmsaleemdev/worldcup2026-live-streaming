/**
 * Ad impression/click event handler (Req 14.5).
 * POST /api/ads/[id]/event — atomically increments the ad's impression or click counter.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Props) {
  const { id } = await params;

  let body: { type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = body.type;
  if (eventType !== "impression" && eventType !== "click") {
    return NextResponse.json(
      { error: "type must be 'impression' or 'click'" },
      { status: 400 },
    );
  }

  try {
    const field = eventType === "impression" ? "impressions" : "clicks";
    await prisma.advertisement.update({
      where: { id },
      data: { [field]: { increment: 1 } },
    });
    return NextResponse.json({ recorded: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Ad not found" }, { status: 404 });
  }
}
