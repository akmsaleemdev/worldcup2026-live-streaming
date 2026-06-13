import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  PlayerProfile,
  type PlayerProfileData,
} from "@/components/match-center/PlayerProfile";
import { playerMetadata } from "@/lib/seo/site";

/**
 * Player profile page (Req 3.5).
 *
 * Server component. Loads a player with their team and renders their statistics
 * (goals, assists, yellow cards, red cards) via the `PlayerProfile` component.
 */

export const revalidate = 60;

interface PlayerPageProps {
  params: Promise<{ id: string }>;
}

async function loadPlayer(id: string) {
  return prisma.player.findUnique({
    where: { id },
    include: { team: { select: { name: true } } },
  });
}

export async function generateMetadata({
  params,
}: PlayerPageProps): Promise<Metadata> {
  const { id } = await params;
  const player = await loadPlayer(id);
  if (!player) {
    return { title: "Player not found — KOORAKIT" };
  }
  return playerMetadata({
    id: player.id,
    name: player.name,
    teamName: player.team?.name ?? null,
  });
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { id } = await params;
  const player = await loadPlayer(id);

  if (!player) {
    notFound();
  }

  const data: PlayerProfileData = {
    id: player.id,
    name: player.name,
    number: player.number,
    position: player.position,
    age: player.age,
    photoUrl: player.photoUrl,
    goals: player.goals,
    assists: player.assists,
    yellowCards: player.yellowCards,
    redCards: player.redCards,
    teamName: player.team?.name ?? null,
  };

  return <PlayerProfile player={data} />;
}
