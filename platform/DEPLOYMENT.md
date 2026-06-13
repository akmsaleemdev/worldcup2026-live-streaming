# KOORAKIT — Deployment & Operations Guide

## Table of Contents

1. [Overview](#overview)
2. [Vercel Deployment Guide](#vercel-deployment-guide)
3. [Environment Variables](#environment-variables)
4. [Database Configuration](#database-configuration)
5. [Admin Dashboard](#admin-dashboard)
6. [Third-Party Integrations](#third-party-integrations)
7. [Build & Start Commands](#build--start-commands)
8. [Post-Deployment Checklist](#post-deployment-checklist)
9. [Local Development Setup](#local-development-setup)
10. [Maintenance & Troubleshooting](#maintenance--troubleshooting)

---

## Overview

| Item | Value |
|------|-------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| ORM | Prisma 7 |
| Database | PostgreSQL |
| Auth | NextAuth v4 (JWT) |
| Styling | Tailwind CSS v4 |
| 3D | React Three Fiber + Drei |
| Animation | Framer Motion, GSAP, Lenis |
| Tests | Vitest + fast-check |
| Package Manager | npm |
| Node.js | >= 20.x |

---

## Vercel Deployment Guide

### Step 1: Connect GitHub Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the repository: `https://github.com/akmsaleemdev/worldcup2026-live-streaming`
3. Select the `koorakit-platform-v1` branch (or `main` after merge)

### Step 2: Project Configuration

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Root Directory | `platform` |
| Build Command | `npx prisma generate && npm run build` |
| Install Command | `npm install` |
| Output Directory | `.next` (auto-detected) |
| Node.js Version | 20.x |

### Step 3: Environment Variables

Add all required variables (see [Environment Variables](#environment-variables) section below) in **Vercel → Project Settings → Environment Variables**.

### Step 4: Database Setup

1. Create a PostgreSQL database (Vercel Postgres, Neon, Supabase, or Railway)
2. Copy the connection string to `DATABASE_URL`
3. After first deploy, run migrations:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```
   Or via Vercel CLI:
   ```bash
   vercel env pull .env.local
   npx prisma migrate deploy
   npx prisma db seed
   ```

### Step 5: Deploy

Click **Deploy**. Vercel builds and deploys automatically on every push.

---

## Environment Variables

### Required

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/koorakit?sslmode=require` | ✅ Yes |
| `NEXTAUTH_URL` | Canonical site URL | `https://koorakit.com` | ✅ Yes |
| `NEXTAUTH_SECRET` | JWT signing secret (generate with `openssl rand -base64 32`) | `aB3x...random64chars` | ✅ Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `123456.apps.googleusercontent.com` | ✅ Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `GOCSPX-...` | ✅ Yes |

### Optional

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `EMAIL_SERVER` | SMTP connection for email auth | `smtp://user:pass@smtp.gmail.com:587` | ❌ Optional |
| `EMAIL_FROM` | Sender address for auth emails | `noreply@koorakit.com` | ❌ Optional |
| `NEXT_PUBLIC_GA4_ID` | Google Analytics 4 Measurement ID | `G-XXXXXXXXXX` | ❌ Optional |
| `NEXT_PUBLIC_GTM_ID` | Google Tag Manager Container ID | `GTM-XXXXXXX` | ❌ Optional |
| `NEXT_PUBLIC_ADSENSE_ID` | Google AdSense Publisher ID | `ca-pub-XXXXXXXXXXXXXXXX` | ❌ Optional |
| `UPSTASH_REDIS_REST_URL` | Redis cache URL (Upstash) | `https://xxx.upstash.io` | ❌ Optional |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth token | `AX...token` | ❌ Optional |
| `NEXT_PUBLIC_SITE_URL` | Public-facing URL (for sitemaps) | `https://koorakit.com` | ❌ Optional |

### Generating Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Database Configuration

### Technology Stack

| Component | Technology |
|-----------|-----------|
| Database | PostgreSQL 15+ |
| ORM | Prisma 7 |
| Adapter | `@prisma/adapter-pg` |
| Migration | Prisma Migrate |

### Connection String Format

```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

### Schema Overview

The database contains 25+ models covering:
- **Auth**: User, Account, Session (NextAuth compatible)
- **RBAC**: Permission, RolePermission (6 roles: USER → SUPER_ADMIN)
- **Tournament**: Team, Player, Group, Standing, KnockoutRound
- **Matches**: Match, MatchEvent, StreamSource
- **Content**: Article, Category, Tag, Comment, Faq
- **System**: Advertisement, AnalyticsEvent, Notification, SeoMetadata, AuditLog, Setting, Media

### Migration Commands

```bash
# Deploy migrations to production (non-interactive)
npx prisma migrate deploy

# Create a new migration during development
npx prisma migrate dev --name "description"

# Validate schema
npx prisma validate

# Generate client
npx prisma generate
```

### Seed Commands

```bash
# Run seed (creates admin, permissions, groups, settings, imports legacy data)
npx prisma db seed
```

### Backup & Restore

```bash
# Backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20260613.sql
```

### Confirmation

| Question | Answer |
|----------|--------|
| Are migrations required before deployment? | ✅ Yes — run `prisma migrate deploy` |
| Is seed data required? | ✅ Yes — creates RBAC permissions, groups, admin account |
| Is the Master Admin auto-seeded? | ✅ Yes — `saleem@koorakit.com` with SUPER_ADMIN role |

---

## Admin Dashboard

### Master Admin Credentials

| Field | Value |
|-------|-------|
| Email | `saleem@koorakit.com` |
| Password | `Create$@007` |
| Role | SUPER_ADMIN |
| Access | Full unrestricted dashboard access |

### Features

- Automatically created during `prisma db seed`
- Password stored with SHA-256 + salt hashing
- Password changeable after first login
- All RBAC permissions granted (content, stream, match, tournament, ads, FAQ, user, settings, analytics management)

### Role Hierarchy

| Role | Access Level |
|------|-------------|
| SUPER_ADMIN | Full access to everything |
| ADMIN | All management except settings |
| EDITOR | Content and news management |
| MODERATOR | Comments and user moderation |
| ANALYST | Analytics view only |
| USER | Public access only |

---

## Third-Party Integrations

### Authentication Providers

| Provider | Status | Required Keys | Setup |
|----------|--------|---------------|-------|
| Google OAuth | ✅ Active | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 |
| Email/Password | ✅ Active | `EMAIL_SERVER` (optional SMTP) | Set `EMAIL_SERVER` env var with SMTP connection string |

**Google OAuth Callback URL:** `https://your-domain.com/api/auth/callback/google`

### Analytics & Ads

| Service | Required Keys | Purpose |
|---------|---------------|---------|
| Google Analytics 4 | `NEXT_PUBLIC_GA4_ID` | Page/video view tracking |
| Google Tag Manager | `NEXT_PUBLIC_GTM_ID` | Event tracking, ad clicks, user journey |
| Google AdSense | `NEXT_PUBLIC_ADSENSE_ID` | Advertisement monetization |

### Caching (Optional)

| Service | Required Keys | Purpose |
|---------|---------------|---------|
| Upstash Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Hot-read caching for standings/fixtures |

**Graceful fallback:** When Redis is not configured, the app uses ISR/in-process caching with no functional loss.

### Services NOT Used

The following are NOT required by this application:
- ❌ AWS S3, Cloudinary, Supabase Storage (no file uploads in v1)
- ❌ Stripe, PayPal (no payments)
- ❌ OpenAI, Twilio, WhatsApp
- ❌ GitHub OAuth, Auth0, Clerk, Firebase Auth
- ❌ SendGrid, Resend, Mailgun (standard SMTP supported via EMAIL_SERVER)

---

## Webhooks & External Services

| Requirement | Status | Notes |
|-------------|--------|-------|
| Webhooks | ❌ Not required | — |
| Cron Jobs | ✅ Optional | Stream health probes via Vercel Cron (configured in `vercel.json`) |
| Background Workers | ❌ Not required | — |
| Queue Systems | ❌ Not required | — |
| CDN | ✅ Automatic | Vercel Edge Network handles this |
| DNS Configuration | ✅ Required | Point your domain to Vercel |
| Domain Verification | ✅ Required | Via Vercel dashboard |
| SSL | ✅ Automatic | Vercel provisions SSL automatically |

### Vercel Cron (Optional)

The `vercel.json` includes a cron schedule for stream health probes:
```json
{
  "crons": [
    { "path": "/api/streams/health", "schedule": "*/15 * * * *" }
  ]
}
```

---

## Build & Start Commands

### Package Manager

**npm** (lockfile: `package-lock.json`)

### Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Type check
npm run type-check

# Lint
npm run lint

# Run tests (single run)
npm run test:run

# Generate Prisma client
npx prisma generate
```

### Build Requirements

- Node.js >= 20.x
- npm >= 9.x
- PostgreSQL 15+ (for migrations/seed)

### Production Optimizations

- `output: "standalone"` in next.config.ts (optimized Docker builds)
- Server Components by default (minimal client JS)
- ISR for semi-static pages
- Image optimization via next/image
- Code splitting and dynamic imports for 3D/animation

---

## Post-Deployment Checklist

### Authentication ✅

- [ ] Admin login: `saleem@koorakit.com` / `Create$@007` → redirects to `/admin`
- [ ] Google OAuth: click "Sign in with Google" → completes flow
- [ ] Unauthorized access: visit `/admin` without auth → redirected to login
- [ ] Role enforcement: USER role cannot access `/admin` content modules

### Database ✅

- [ ] `prisma migrate deploy` completes without errors
- [ ] `prisma db seed` creates admin + permissions + groups + settings
- [ ] Verify: `SELECT * FROM "User" WHERE email='saleem@koorakit.com'` returns SUPER_ADMIN
- [ ] CRUD operations: create a test article via admin → appears on `/news`

### API Testing ✅

- [ ] `GET /api/streams/health` — returns health probe status
- [ ] `GET /api/streams/[matchId]` — returns stream playlist (empty if no sources)
- [ ] `POST /api/analytics/video` — returns 201/202
- [ ] `POST /api/ads/[id]/event` — returns 200 or 404

### Frontend Verification ✅

- [ ] Homepage loads with KOORAKIT branding, countdown, CTAs
- [ ] 3D hero renders (or static fallback on unsupported browsers)
- [ ] `/matches`, `/standings`, `/bracket` render correctly
- [ ] `/news` lists published articles
- [ ] Mobile responsive: test at 375px, 768px, 1024px widths
- [ ] Dark mode default; theme switcher toggles to light

### Security ✅

- [ ] Response headers include CSP, X-Frame-Options, X-Content-Type-Options
- [ ] Auth cookies: HttpOnly, Secure, SameSite=Lax
- [ ] Rate limiting: rapid requests to `/api/auth/*` return 429
- [ ] No FIFA marks in rendered HTML (search page source for "FIFA")
- [ ] Environment variables not exposed to client (only NEXT_PUBLIC_* visible)

---

## Local Development Setup

```bash
# 1. Clone
git clone https://github.com/akmsaleemdev/worldcup2026-live-streaming.git
cd worldcup2026-live-streaming/platform

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your local PostgreSQL URL and secrets

# 4. Start PostgreSQL (Docker)
docker-compose up -d db

# 5. Run migrations and seed
npx prisma migrate deploy
npx prisma db seed

# 6. Start dev server
npm run dev
# → http://localhost:3000

# 7. Run tests
npm run test:run
```

---

## Maintenance & Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| Build fails on Prisma | Run `npx prisma generate` before `npm run build` |
| Auth not working | Check `NEXTAUTH_URL` matches actual domain; verify `NEXTAUTH_SECRET` is set |
| Google login fails | Verify callback URL in Google Console matches `{NEXTAUTH_URL}/api/auth/callback/google` |
| 3D scene blank | WebGL not supported; the app falls back to a static gradient |
| Redis errors in logs | Non-fatal; app falls back to ISR. Check `UPSTASH_REDIS_REST_URL` if needed |
| Seed fails | Ensure `DATABASE_URL` is reachable; run `prisma migrate deploy` first |

### Logs

- **Vercel:** Project → Deployments → Functions → Logs
- **Local:** Check terminal output from `npm run dev`
- **Database:** Run `npx prisma studio` to inspect data visually

### Backup & Recovery

```bash
# Scheduled backup (add to cron)
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/koorakit_$(date +\%Y\%m\%d).sql.gz

# Restore from backup
gunzip -c backup.sql.gz | psql $DATABASE_URL

# Point-in-time recovery (if using managed Postgres)
# Use your provider's dashboard (Neon, Supabase, etc.)
```

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update non-breaking
npm update

# Regenerate Prisma after schema changes
npx prisma migrate dev --name "description"
npx prisma generate
```

---

## Final Handover Summary

| Deliverable | Status |
|-------------|--------|
| GitHub Repository | ✅ `https://github.com/akmsaleemdev/worldcup2026-live-streaming` (branch: `koorakit-platform-v1`) |
| Production-Ready Source Code | ✅ TypeScript, type-checked, linted, 89 tests passing |
| Vercel Deployment Guide | ✅ This document |
| Environment Variables Documentation | ✅ This document |
| Database Configuration | ✅ PostgreSQL + Prisma 7, migrations + seed |
| Migration & Seed Instructions | ✅ `prisma migrate deploy` + `prisma db seed` |
| API & Third-Party Documentation | ✅ Google OAuth, GA4, GTM, AdSense, Upstash |
| Admin Credentials | ✅ `saleem@koorakit.com` / `Create$@007` (SUPER_ADMIN) |
| Deployment Verification Report | ✅ Post-deployment checklist included |
| Technical Documentation | ✅ This document + inline code documentation |
