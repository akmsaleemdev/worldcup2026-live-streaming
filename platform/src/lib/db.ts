/**
 * Singleton Prisma client.
 *
 * Uses the standard Next.js global-cached pattern so that hot reloads in
 * development do not open a new database connection on every module
 * re-evaluation (which would otherwise exhaust the connection pool). In
 * production a single client instance is created per server process.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// The schema's `datasource` block intentionally omits `url`; the connection
// string lives in `prisma.config.ts` for CLI commands. The Prisma 7 runtime
// client does not read `prisma.config.ts` and requires a driver adapter, so the
// PostgreSQL connection is supplied explicitly here via `@prisma/adapter-pg`.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
