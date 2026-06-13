/**
 * Prisma seed + one-time legacy import.
 *
 * Run via `prisma db seed` (wired in package.json -> prisma.seed using tsx).
 *
 * Responsibilities (task 2.3, Requirements 4.5, 2.1):
 *  1. Seed the RBAC `Permission` and `RolePermission` rows. The permission set
 *     and role -> permission mapping are derived directly from
 *     `src/lib/rbac.ts` (the single source of truth) so the database and the
 *     pure resolver can never drift apart.
 *  2. Seed initial tournament scaffolding: World Cup 2026 groups and baseline
 *     `Setting` rows.
 *  3. Perform an idempotent one-time import of the repo-root legacy JSON data
 *     files (`data/matches.json`, `data/streams.json`, `data/poly-odds.json`,
 *     `data/poly-match-odds.json`) into PostgreSQL via Prisma upserts.
 *
 * All writes use upserts keyed on stable identifiers, so the script is safe to
 * run repeatedly without creating duplicates.
 *
 * Assumptions about the legacy JSON shapes are documented inline next to each
 * importer, and the script is defensive about missing/variant fields.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient, MatchStatus, StreamType, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import {
  ALL_PERMISSIONS,
  can,
  type Permission,
  type Role as RbacRole,
} from "../src/lib/rbac";

// Prisma 7 requires a driver adapter; the connection string is read from the
// environment (loaded via prisma.config.ts / dotenv when run through the CLI).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * The six application roles, mirroring the Prisma `Role` enum. Declared here so
 * the seed can iterate every role when materialising the RBAC tables. The
 * permission membership itself comes from `can()` in `src/lib/rbac.ts`.
 */
const ALL_ROLES: readonly RbacRole[] = [
  "USER",
  "MODERATOR",
  "ANALYST",
  "EDITOR",
  "ADMIN",
  "SUPER_ADMIN",
];

// ---------------------------------------------------------------------------
// Legacy JSON shapes (best-effort; all fields treated as optional at runtime).
// ---------------------------------------------------------------------------

interface LegacyMatch {
  id?: number | string;
  home_team?: string;
  away_team?: string;
  league?: string;
  match_date?: string;
  status?: string;
  stadium?: string;
}

interface LegacyStream {
  id?: number | string;
  match_id?: number | string;
  source_name?: string;
  stream_url?: string;
  quality?: string;
  language?: string;
  votes?: number;
  reports?: number;
  is_working?: number | boolean;
  type?: string;
  note?: string;
}

interface PolyOddsFile {
  updatedAt?: string;
  source?: string;
  odds?: Record<string, unknown>;
}

interface PolyMatchOddsFile {
  updatedAt?: string;
  source?: string;
  matchCount?: number;
  odds?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a repo-root `data/<name>` file. The platform app lives in
 * `<repo>/platform`, so the legacy data directory is one level up. We probe a
 * few candidate base directories to stay robust regardless of the working
 * directory `prisma db seed` is launched from.
 */
function resolveDataFile(name: string): string | null {
  const candidates = [
    path.resolve(__dirname, "../../data", name), // <repo>/data from platform/prisma
    path.resolve(process.cwd(), "../data", name), // cwd = platform
    path.resolve(process.cwd(), "data", name), // cwd = repo root
    path.resolve(__dirname, "../../../data", name),
  ];
  for (const candidate of candidates) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }
  return null;
}

/**
 * Read and JSON-parse a repo-root data file. Returns `fallback` (and warns) if
 * the file is missing or unparseable, so a single bad file never aborts the
 * whole seed.
 */
function readJson<T>(name: string, fallback: T): T {
  const file = resolveDataFile(name);
  if (!file) {
    console.warn(`[seed] data file not found, skipping: ${name}`);
    return fallback;
  }
  try {
    return JSON.parse(readFileSync(file, "utf-8")) as T;
  } catch (err) {
    console.warn(`[seed] failed to parse ${name}: ${(err as Error).message}`);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Field coercion helpers (defensive against variant/missing legacy fields)
// ---------------------------------------------------------------------------

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

/** Map a legacy status string to the `MatchStatus` enum. */
function toMatchStatus(value: unknown): MatchStatus {
  switch (str(value).toLowerCase()) {
    case "live":
    case "in_play":
    case "playing":
      return MatchStatus.LIVE;
    case "completed":
    case "finished":
    case "ft":
    case "full_time":
      return MatchStatus.COMPLETED;
    case "postponed":
    case "suspended":
      return MatchStatus.POSTPONED;
    case "scheduled":
    case "upcoming":
    case "not_started":
    default:
      return MatchStatus.UPCOMING;
  }
}

/** Map a legacy stream type string to the `StreamType` enum. */
function toStreamType(value: unknown): StreamType {
  return str(value).toLowerCase() === "dash"
    ? StreamType.DASH
    : StreamType.HLS;
}

/**
 * Parse a legacy date string. Legacy matches use `"YYYY-MM-DD HH:mm"`; we
 * normalise the space to `T` so it parses deterministically. Falls back to the
 * current time if the value is missing or invalid.
 */
function toDate(value: unknown): Date {
  const raw = str(value);
  if (raw) {
    const normalised = raw.includes("T") ? raw : raw.replace(" ", "T");
    const parsed = new Date(normalised);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

// ---------------------------------------------------------------------------
// Seeders
// ---------------------------------------------------------------------------

/**
 * Materialise the RBAC tables from `src/lib/rbac.ts`. Creates one `Permission`
 * row per action and one `RolePermission` row per (role, permission) pair for
 * which `can(role, permission)` is true. Idempotent: permissions upsert on
 * their unique `action`, role-permissions upsert on the `(role, permissionId)`
 * composite unique.
 */
async function seedPermissions(): Promise<void> {
  const permissionIdByAction = new Map<Permission, string>();

  for (const action of ALL_PERMISSIONS) {
    const row = await prisma.permission.upsert({
      where: { action },
      update: {},
      create: { action },
    });
    permissionIdByAction.set(action, row.id);
  }

  let rolePermissionCount = 0;
  for (const role of ALL_ROLES) {
    for (const action of ALL_PERMISSIONS) {
      if (!can(role, action)) continue;
      const permissionId = permissionIdByAction.get(action)!;
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role: role as Role, permissionId } },
        update: {},
        create: { role: role as Role, permissionId },
      });
      rolePermissionCount += 1;
    }
  }

  console.log(
    `[seed] RBAC: ${ALL_PERMISSIONS.length} permissions, ${rolePermissionCount} role-permission grants`,
  );
}

/** Seed the 12 World Cup 2026 groups (A–L). Idempotent on unique `name`. */
async function seedGroups(): Promise<void> {
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  for (const letter of letters) {
    const name = `Group ${letter}`;
    await prisma.group.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`[seed] groups: ${letters.length}`);
}

/** Seed baseline platform settings. Idempotent on unique `key`. */
async function seedSettings(): Promise<void> {
  const settings: Array<{ key: string; value: string; description: string }> = [
    {
      key: "site_name",
      value: "KOORAKIT",
      description: "Public site/brand name",
    },
    {
      key: "default_theme",
      value: "DARK",
      description: "Default theme mode for new visitors",
    },
    {
      key: "countdown_target",
      value: "2026-06-11T00:00:00.000Z",
      description: "Homepage hero countdown target (World Cup 2026 kickoff)",
    },
    {
      key: "tournament_name",
      value: "World Cup 2026",
      description: "Active tournament label",
    },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, description: setting.description },
      create: setting,
    });
  }
  console.log(`[seed] settings: ${settings.length}`);
}

// ---------------------------------------------------------------------------
// Legacy importers
// ---------------------------------------------------------------------------

/**
 * Import legacy matches and the teams they reference.
 *
 * Teams are upserted by their unique `name` (deduplicating teams that appear in
 * multiple fixtures). Matches are upserted on a deterministic id derived from
 * the legacy numeric id (`legacy-match-<id>`) so re-runs update in place rather
 * than inserting duplicates. The legacy `league` is stored in `Match.stage`
 * and the `stadium` is stored in both `stadium` and `venue`.
 *
 * Returns a map of legacy match id -> Prisma match id for the stream importer.
 */
async function importMatches(): Promise<Map<string, string>> {
  const matches = readJson<LegacyMatch[]>("matches.json", []);
  const legacyToDbId = new Map<string, string>();
  const teamIdByName = new Map<string, string>();

  async function ensureTeam(name: string): Promise<string | null> {
    const clean = str(name);
    if (!clean) return null;
    if (teamIdByName.has(clean)) return teamIdByName.get(clean)!;
    const team = await prisma.team.upsert({
      where: { name: clean },
      update: {},
      create: { name: clean },
    });
    teamIdByName.set(clean, team.id);
    return team.id;
  }

  let imported = 0;
  for (const m of matches) {
    if (m.id === undefined || m.id === null) continue;
    const homeId = await ensureTeam(str(m.home_team));
    const awayId = await ensureTeam(str(m.away_team));
    if (!homeId || !awayId) {
      console.warn(`[seed] match ${m.id} skipped (missing team name)`);
      continue;
    }

    const dbId = `legacy-match-${m.id}`;
    const stadium = str(m.stadium) || null;
    const data = {
      homeTeamId: homeId,
      awayTeamId: awayId,
      matchDate: toDate(m.match_date),
      status: toMatchStatus(m.status),
      stadium,
      venue: stadium,
      stage: str(m.league) || null,
    };

    await prisma.match.upsert({
      where: { id: dbId },
      update: data,
      create: { id: dbId, ...data },
    });
    legacyToDbId.set(String(m.id), dbId);
    imported += 1;
  }

  console.log(
    `[seed] matches: ${imported} imported, teams: ${teamIdByName.size}`,
  );
  return legacyToDbId;
}

/**
 * Import legacy streams into `StreamSource`.
 *
 * Assumptions:
 *  - `legallyPermitted` is forced to `false` on every imported source. Sources
 *    must be explicitly vetted/enabled by an operator before they can appear in
 *    a playlist (Req 2.6 / 21.3).
 *  - Legacy streams carry no explicit failover `priority`; we derive it per
 *    match by ranking sources on `votes` descending (more upvotes => tried
 *    first => lower priority number). Ties keep input order.
 *  - `active` mirrors the legacy `is_working` flag; `healthy` stays false until
 *    a real probe runs.
 *
 * Streams whose `match_id` has no corresponding imported match are skipped
 * (the FK would otherwise fail). Upserts use a deterministic
 * `legacy-stream-<id>` id for idempotency.
 */
async function importStreams(
  legacyMatchToDbId: Map<string, string>,
): Promise<void> {
  const streams = readJson<LegacyStream[]>("streams.json", []);

  // Group by match so we can assign relative priorities.
  const byMatch = new Map<string, LegacyStream[]>();
  for (const s of streams) {
    if (s.match_id === undefined || s.match_id === null) continue;
    const key = String(s.match_id);
    const list = byMatch.get(key) ?? [];
    list.push(s);
    byMatch.set(key, list);
  }

  let imported = 0;
  let skipped = 0;
  for (const [legacyMatchId, group] of byMatch) {
    const matchId = legacyMatchToDbId.get(legacyMatchId);
    if (!matchId) {
      skipped += group.length;
      continue;
    }

    // Higher votes => higher priority (lower number). Stable for ties.
    const ranked = [...group].sort(
      (a, b) => (b.votes ?? 0) - (a.votes ?? 0),
    );

    for (let priority = 0; priority < ranked.length; priority += 1) {
      const s = ranked[priority];
      if (s.id === undefined || s.id === null) {
        skipped += 1;
        continue;
      }
      const streamUrl = str(s.stream_url);
      if (!streamUrl) {
        skipped += 1;
        continue;
      }

      const dbId = `legacy-stream-${s.id}`;
      const isWorking =
        s.is_working === undefined ? true : Boolean(s.is_working);
      const data = {
        matchId,
        sourceName: str(s.source_name, "Unknown Source"),
        streamUrl,
        quality: str(s.quality, "1080p"),
        language: str(s.language, "EN"),
        type: toStreamType(s.type),
        priority,
        active: isWorking,
        legallyPermitted: false, // Req 2.6 / 21.3 — must be explicitly vetted.
        healthy: false, // requires a live probe (task 4.5/4.6).
      };

      await prisma.streamSource.upsert({
        where: { id: dbId },
        update: data,
        create: { id: dbId, ...data },
      });
      imported += 1;
    }
  }

  console.log(`[seed] stream sources: ${imported} imported, ${skipped} skipped`);
}

/**
 * Import Polymarket odds blobs.
 *
 * The schema has no dedicated odds model, so these reference datasets are
 * stored as JSON-encoded `Setting` rows (keys `odds:outright` and
 * `odds:matches`). This keeps the data queryable via Prisma and idempotent via
 * the unique `key`, without inventing schema not covered by the design.
 */
async function importOdds(): Promise<void> {
  const outright = readJson<PolyOddsFile>("poly-odds.json", {});
  const matchOdds = readJson<PolyMatchOddsFile>("poly-match-odds.json", {});

  const rows: Array<{ key: string; value: string; description: string }> = [];

  if (outright.odds && Object.keys(outright.odds).length > 0) {
    rows.push({
      key: "odds:outright",
      value: JSON.stringify(outright),
      description: `Polymarket outright winner odds (source: ${str(
        outright.source,
        "polymarket",
      )})`,
    });
  }

  if (matchOdds.odds && Object.keys(matchOdds.odds).length > 0) {
    rows.push({
      key: "odds:matches",
      value: JSON.stringify(matchOdds),
      description: `Polymarket per-match odds (source: ${str(
        matchOdds.source,
        "polymarket",
      )})`,
    });
  }

  for (const row of rows) {
    await prisma.setting.upsert({
      where: { key: row.key },
      update: { value: row.value, description: row.description },
      create: row,
    });
  }

  console.log(`[seed] odds blobs: ${rows.length}`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("[seed] starting…");
  await seedPermissions();
  await seedGroups();
  await seedSettings();

  const legacyMatchToDbId = await importMatches();
  await importStreams(legacyMatchToDbId);
  await importOdds();

  console.log("[seed] done.");
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
