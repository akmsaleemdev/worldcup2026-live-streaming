# ⚽ KOORAKIT — World Cup 2026 Streaming Platform

> The Global Football Festival — Premium live streaming, match center, and tournament coverage.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Tests](https://img.shields.io/badge/Tests-89%20passing-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🚀 Quick Start

```bash
# Clone and enter platform directory
git clone https://github.com/akmsaleemdev/worldcup2026-live-streaming.git
cd worldcup2026-live-streaming/platform

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database URL and secrets

# Run database setup
npx prisma migrate deploy
npx prisma db seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| UI | Custom components + Lucide icons |
| Animation | Framer Motion, GSAP, Lenis |
| 3D | React Three Fiber + Drei |
| Database | PostgreSQL + Prisma 7 |
| Auth | NextAuth v4 (JWT, Google, Email) |
| Streaming | HLS.js + Video.js (custom player) |
| Testing | Vitest + fast-check (property-based) |
| Caching | Upstash Redis (optional) |

## 📁 Project Structure

```
platform/
├── prisma/              # Schema, migrations, seed
├── src/
│   ├── app/             # Next.js App Router pages
│   │   ├── (public)/    # Public pages (matches, news, FAQ, etc.)
│   │   ├── admin/       # CMS dashboard (RBAC-gated)
│   │   └── api/         # Route handlers
│   ├── components/      # React components
│   │   ├── analytics/   # GA4/GTM integration
│   │   ├── animations/  # Motion wrappers
│   │   ├── home/        # Homepage sections
│   │   ├── match-center/# Match UI components
│   │   ├── motion/      # Scroll reveals
│   │   ├── player/      # Custom streaming player + cast controls
│   │   ├── seo/         # JSON-LD injection
│   │   ├── theme/       # ThemeProvider + switcher
│   │   ├── three/       # 3D hero scene
│   │   └── ui/          # Base primitives
│   ├── lib/             # Pure logic & services
│   │   ├── ads/         # Ad counter accumulation
│   │   ├── analytics/   # GA4 gtag helpers
│   │   ├── auth/        # NextAuth options, role resolution
│   │   ├── cache/       # Redis caching layer
│   │   ├── cms/         # Audit log, action helpers
│   │   ├── content/     # Slug, related articles, categories
│   │   ├── match/       # Grouping, standings, bracket, events
│   │   ├── player/      # Failover, playlist, health probe
│   │   ├── security/    # Rate limiting
│   │   ├── seo/         # Metadata, JSON-LD builders, sitemap
│   │   └── theme/       # Resolve, contrast utilities
│   └── test/            # Test setup (fast-check global config)
├── vercel.json          # Vercel deployment config
├── Dockerfile           # Multi-stage container build
├── docker-compose.yml   # Local dev (app + PostgreSQL)
└── DEPLOYMENT.md        # Full deployment & operations guide
```

## 🔑 Features

### Streaming
- Custom HLS.js + Video.js player (no iframes)
- Adaptive bitrate with quality selector
- Multi-source failover (10s watchdog)
- Stream health monitoring
- PiP, AirPlay, Chromecast, multi-audio (capability-gated)
- DVR/seek in live buffer

### Match Center
- Live / Upcoming / Completed match listings
- Match detail with tabs (Overview, Lineups, Venue, Referee)
- Group standings with full arithmetic
- Knockout brackets (R32 → Final)
- Player profiles with stats

### CMS / Admin
- RBAC-gated dashboard (6 roles)
- Stream source CRUD with health display
- Match & tournament management
- News article editor with categories & tags
- FAQ management for AEO
- Ad placement management
- Audit logging on all mutations

### SEO / AEO
- Per-page metadata (OpenGraph, Twitter Cards, canonical)
- XML sitemap + robots.txt
- JSON-LD: Organization, SportsEvent, Article, FAQPage
- Entity-relationship structured data (athletes, teams)
- Semantic HTML landmarks

### Theme
- KOORAKIT navy/gold dark palette (default)
- Light mode with theme switcher
- Preference persisted across sessions
- WCAG AA contrast compliance

## 🧪 Testing

```bash
# Run all tests (27 files, 89 tests)
npm run test:run

# Watch mode
npm test

# Type check
npm run type-check

# Lint
npm run lint
```

Property-based tests cover: failover ordering, standings arithmetic, RBAC resolution, slug generation, ad counters, theme resolution, rate limiting, and more.

## 🐳 Docker

```bash
# Start app + PostgreSQL
docker-compose up -d

# Run migrations inside container
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx prisma db seed
```

## 📖 Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the complete Vercel deployment guide, environment variables, database setup, admin credentials, and post-deployment checklist.

## 📄 License

MIT — see [LICENSE](../LICENSE)
