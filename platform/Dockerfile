# syntax=docker/dockerfile:1

# KOORAKIT (World Cup 2026 platform) — multi-stage Next.js standalone image.
# Scoped to the platform/ app. Build context must be the platform/ directory.

# ---------- deps: install production-capable node_modules ----------
FROM node:20-alpine AS deps
# libc6-compat keeps some native deps (e.g. Prisma engines) happy on Alpine.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the lockfile only, for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# ---------- build: generate Prisma client and build the app ----------
FROM node:20-alpine AS build
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate the Prisma client against the committed schema (Req 4.x).
RUN npx prisma generate

# Telemetry off for reproducible CI builds; produce the standalone output.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- runner: minimal runtime image ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as an unprivileged user.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Public assets and the standalone server bundle (Next traced node_modules).
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

# Ship the Prisma schema + generated client so migrate/generate work at runtime.
COPY --from=build --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000

# server.js is emitted by Next.js in the standalone output.
CMD ["node", "server.js"]
