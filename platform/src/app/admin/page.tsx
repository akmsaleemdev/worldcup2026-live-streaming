/**
 * Admin dashboard (server component) — Req 6.1.
 *
 * Summarizes platform counts pulled live from the database: streaming sources
 * (active vs. total), registered users, published/total articles, and matches
 * (live vs. total). All counts are gathered in parallel.
 *
 * Empty-database handling: `count` naturally returns 0 for an empty table, so
 * a fresh install renders zeros rather than crashing. As an additional
 * safeguard, the aggregation is wrapped so that a transient datastore error
 * degrades to zeroed cards plus a non-blocking notice instead of throwing.
 */
import { Activity, FileText, Tv, Users, type LucideIcon } from "lucide-react";

import { prisma } from "@/lib/db";

// Always render fresh counts; never serve stale cached numbers.
export const dynamic = "force-dynamic";

type DashboardStats = {
  activeStreams: number;
  totalStreams: number;
  users: number;
  articles: number;
  liveMatches: number;
  totalMatches: number;
};

const EMPTY_STATS: DashboardStats = {
  activeStreams: 0,
  totalStreams: 0,
  users: 0,
  articles: 0,
  liveMatches: 0,
  totalMatches: 0,
};

async function getDashboardStats(): Promise<{
  stats: DashboardStats;
  ok: boolean;
}> {
  try {
    const [
      activeStreams,
      totalStreams,
      users,
      articles,
      liveMatches,
      totalMatches,
    ] = await Promise.all([
      prisma.streamSource.count({ where: { active: true } }),
      prisma.streamSource.count(),
      prisma.user.count(),
      prisma.article.count(),
      prisma.match.count({ where: { status: "LIVE" } }),
      prisma.match.count(),
    ]);

    return {
      stats: {
        activeStreams,
        totalStreams,
        users,
        articles,
        liveMatches,
        totalMatches,
      },
      ok: true,
    };
  } catch {
    // Datastore unavailable: degrade gracefully rather than crash the console.
    return { stats: EMPTY_STATS, ok: false };
  }
}

export default async function AdminDashboard() {
  const { stats, ok } = await getDashboardStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Dashboard Overview
        </h1>
        <p className="mt-1 text-foreground/60">
          Streaming, content, and match activity at a glance.
        </p>
      </div>

      {!ok && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          Live metrics are temporarily unavailable. Showing zeros until the data
          source responds.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Live Streams"
          value={stats.activeStreams}
          subtitle={`${stats.totalStreams} total sources`}
          icon={Tv}
        />
        <StatCard
          title="Matches Live"
          value={stats.liveMatches}
          subtitle={`${stats.totalMatches} total matches`}
          icon={Activity}
        />
        <StatCard
          title="Registered Users"
          value={stats.users}
          subtitle="Total accounts"
          icon={Users}
        />
        <StatCard
          title="Articles"
          value={stats.articles}
          subtitle="Total content items"
          icon={FileText}
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: LucideIcon;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-accent/15 bg-surface/60 p-6 transition-colors hover:border-accent/30">
      <div className="absolute -right-4 -top-4 opacity-5 transition-transform duration-500 group-hover:scale-110">
        <Icon className="h-24 w-24 text-accent" />
      </div>
      <div className="relative z-10 mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground/60">{title}</h3>
        <div className="rounded-lg bg-accent/10 p-2">
          <Icon className="h-5 w-5 text-accent" />
        </div>
      </div>
      <div className="relative z-10">
        <span className="text-3xl font-bold text-foreground">
          {value.toLocaleString()}
        </span>
        <p className="mt-2 text-sm text-foreground/50">{subtitle}</p>
      </div>
    </div>
  );
}
