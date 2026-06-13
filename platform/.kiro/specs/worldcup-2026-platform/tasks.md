# Implementation Plan: KOORAKIT — World Cup 2026 Platform

## Overview

This plan implements KOORAKIT incrementally inside the existing `platform/` Next.js 16 app (App Router, React 19, TypeScript, Tailwind v4, Prisma 7, NextAuth v4). All code is TypeScript. Work is phased to the requirement tiers:

- **Tier 1 (MVP)** — Requirements 1–10 plus the NFR baselines 17–21. Delivered as a coherent shippable slice that builds, lints, type-checks, ships Vercel + Docker config, and seeds/imports legacy data. Tasks 1–11.
- **Tier 2** — Requirements 11–14 (news, animation/3D, AEO, analytics/ads). Tasks 12–16. Clearly marked **[TIER 2]**.
- **Tier 3** — Requirements 15–16 (advanced playback, light mode, caching). Tasks 17–18. Clearly marked **[TIER 3]**.
- **Finalization** — full build/lint/type-check, branding audit, deployment artifacts. Task 19.

The design defines **16 Correctness Properties** over the pure logic layer in `lib/`. Each property is implemented as a single property-based test using `fast-check` + Vitest, configured for a minimum of 100 iterations, tagged with a comment of the form `// Feature: worldcup-2026-platform, Property {number}: {property_text}`, and placed next to the pure module it validates. Property/test sub-tasks are marked optional with `*`.

## Tasks

- [x] 1. Toolchain and project setup
  - [x] 1.1 Install and configure remaining dependencies
    - Add runtime deps: `three`, `@react-three/fiber`, `@react-three/drei`, `gsap`, `lenis`, `lottie-react`
    - Add dev deps for testing: `vitest`, `fast-check`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `@vitejs/plugin-react`, `@vitest/coverage-v8`
    - Add `@types/three` and any missing type packages
    - Add npm scripts: `test`, `test:run` (single run via `vitest run`), `type-check` (`tsc --noEmit`)
    - _Requirements: 12.1, 12.3, 12.4, 9.3_
  - [x] 1.2 Configure Vitest + fast-check and shadcn/ui
    - Create `vitest.config.ts` with the React plugin, `jsdom` environment, global setup file, and a default `fast-check` run configuration of at least 100 iterations (`fc.configureGlobal({ numRuns: 100 })`)
    - Create `vitest.setup.ts` wiring `@testing-library/jest-dom`
    - Initialize shadcn/ui (components config + base UI primitives directory under `src/components/ui`)
    - _Requirements: 9.3_
  - [x] 1.3 Extend ESLint configuration
    - Update `eslint.config.mjs` to lint `.ts`/`.tsx` test files and `lib/` modules cleanly
    - Ensure lint passes on the empty/initial state
    - _Requirements: 9.2_

- [x] 2. Database: switch to PostgreSQL, extend schema, migrate, and seed
  - [x] 2.1 Switch datasource to PostgreSQL and extend the Prisma schema
    - Change `datasource db` provider to `postgresql` with `url = env("DATABASE_URL")`
    - Expand the `Role` enum to the 6 roles (add `EDITOR`, `ANALYST`); add enums `MatchStatus`, `StreamType`, `MatchEventType`, `KnockoutStage`, `ArticleCategory`, `AdType`, `AdPosition`, `MediaType`, `ThemeMode`
    - Add models `Permission`, `RolePermission`, `Group`, `KnockoutRound`, `StreamSource`, `Media`, `AnalyticsEvent`, `Notification`, `SeoMetadata`, `AuditLog`, `Faq`
    - Enrich `Match` (`status`, `knockoutRoundId`, `venue`, `weather`, `referee`, `homeScore`/`awayScore`), `Team` (`groupId` FK), `Standing` (`Group` relation)
    - Define FK constraints and cascade/restrict behavior (`StreamSource`/`MatchEvent` → `Match` cascade; `AuditLog.actor` SetNull)
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 5.2, 2.2_
  - [x] 2.2 Create the initial Prisma migration
    - Generate the migration for the extended schema and run `prisma validate`
    - Regenerate the Prisma client
    - _Requirements: 4.4_
  - [x] 2.3 Implement seed and one-time legacy import script
    - Create `prisma/seed.ts` seeding initial teams, groups, settings, and the RBAC `Permission`/`RolePermission` rows
    - Implement a one-time import reading repo-root `data/matches.json`, `data/streams.json`, `data/poly-odds.json`, `data/poly-match-odds.json` into PostgreSQL (idempotent upserts)
    - Wire `prisma db seed` configuration
    - _Requirements: 4.5, 2.1_

- [x] 3. Authentication, RBAC, and security foundation
  - [x] 3.1 Implement the RBAC permission resolver
    - Create `lib/rbac.ts` with the permission table, `can(role, perm)`, and `permittedModules(role)` as pure functions
    - _Requirements: 5.2, 5.6, 6.4_
  - [x] 3.2 Write property test for RBAC resolution
    - **Property 6: RBAC resolution is consistent with the permission table**
    - `// Feature: worldcup-2026-platform, Property 6: For any role and permission, can(role, permission) returns true iff the pair exists in the permission table, and permittedModules(role) lists exactly the modules whose required permission the role holds.`
    - fast-check + Vitest, minimum 100 iterations
    - **Validates: Requirements 5.3, 5.6, 6.4**
  - [x] 3.3 Implement default role resolution
    - Create `lib/auth/roles.ts` with `resolveSignInRole(existingRole)` that never downgrades below an elevated role and defaults to `USER`
    - _Requirements: 5.5_
  - [x] 3.4 Write property test for default role assignment
    - **Property 7: Default role assignment never downgrades**
    - `// Feature: worldcup-2026-platform, Property 7: For any existing role on sign-in, the resolved role is the existing role when higher than USER, and USER otherwise; never lowers an elevated role.`
    - fast-check + Vitest, minimum 100 iterations
    - **Validates: Requirements 5.5**
  - [x] 3.5 Implement the rate limiter
    - Create `lib/security/rate-limit.ts` with a pure token-bucket/window decision function (`checkRateLimit(state, now, limit)`), in-memory backing with an optional Redis seam
    - _Requirements: 19.4_
  - [x] 3.6 Write property test for the rate limiter
    - **Property 15: Rate limiter admits up to the limit and rejects beyond it**
    - `// Feature: worldcup-2026-platform, Property 15: For any burst of requests within one window, the first N (the limit) are admitted and every request beyond N is rejected.`
    - fast-check + Vitest, minimum 100 iterations
    - **Validates: Requirements 19.4**
  - [x] 3.7 Configure NextAuth (email + Google, JWT, secure cookies)
    - Implement `app/api/auth/[...nextauth]/route.ts` with Credentials (email magic-link/password) + Google providers, JWT session strategy, default-role assignment via `lib/auth/roles.ts`
    - Configure cookies `httpOnly`, `Secure`, `SameSite=Lax`
    - _Requirements: 5.1, 5.4, 5.5, 19.2_
  - [x] 3.8 Implement middleware auth gate, security headers, and rate-limit wiring
    - Create `src/middleware.ts` gating `/admin/*` and protected APIs (401/403 via `lib/rbac.ts`)
    - Emit CSP and security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy`); wire rate-limit decisions for auth/stream/ad/analytics endpoints (429 + `Retry-After`)
    - _Requirements: 5.3, 19.1, 19.4, 19.5_
  - [x] 3.9 Write unit tests for security headers and cookie attributes
    - Assert presence of CSP/security headers and secure cookie attributes
    - _Requirements: 19.1, 19.2, 19.5_

- [x] 4. Streaming player: pure failover/health logic, API, and component
  - [x] 4.1 Implement the playlist builder
    - Create `lib/player/playlist.ts` `buildPlaylist(sources)` filtering to `legallyPermitted && active` and sorting by `priority` non-decreasing
    - _Requirements: 2.4, 2.6, 21.3_
  - [x] 4.2 Write property test for the playlist builder
    - **Property 1: Failover playlist is ordered and contains only permitted, active sources**
    - `// Feature: worldcup-2026-platform, Property 1: For any set of stream sources, buildPlaylist returns exactly the legallyPermitted && active sources, sorted by priority non-decreasing.`
    - fast-check + Vitest, minimum 100 iterations
    - **Validates: Requirements 2.4, 2.6, 21.3**
  - [x] 4.3 Implement the failover controller
    - Create `lib/player/failover.ts` with `FailoverState`, `nextSource(state)`, and `hasNext(state)`
    - _Requirements: 1.7, 1.8_
  - [x] 4.4 Write property test for failover advancement
    - **Property 2: Failover advances in order and signals exhaustion**
    - `// Feature: worldcup-2026-platform, Property 2: For any resolved playlist, repeatedly applying nextSource visits sources strictly in order without repetition, and hasNext returns false once exhausted.`
    - fast-check + Vitest, minimum 100 iterations
    - **Validates: Requirements 1.7, 1.8**
  - [x] 4.5 Implement the health probe classifier
    - Create `lib/player/health.ts` to probe a source URL (ranged/HEAD), classify the result, and produce `{ healthy, lastStatus, lastCheckedAt }`
    - _Requirements: 2.3_
  - [x] 4.6 Implement stream resolution and health API route handlers
    - `app/api/streams/[matchId]/route.ts` returns the ordered, permitted, active playlist via `buildPlaylist`
    - `app/api/streams/health/route.ts` triggers/reports probes and persists health fields on `StreamSource`
    - _Requirements: 1.7, 2.3, 2.4, 2.5, 2.6, 21.3_
  - [x] 4.7 Implement the StreamingPlayer component
    - Create `components/player/StreamingPlayer.tsx` (client) mounting HLS.js (native HLS on Safari) into a Video.js-skinned `<video>`, no iframe/embed
    - Controls: play/pause, volume, fullscreen, seek; adaptive bitrate with quality→HLS level selector; live badge; DVR seek in buffer
    - 10-second per-source load watchdog advancing via `nextSource`; explicit accessible "No stream available" state when `hasNext` is false; ARIA names on all controls
    - Fetch playlist from `GET /api/streams/[matchId]`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 18.2_
  - [x] 4.8 Write unit tests for player controls and error state
    - Control presence/wiring, quality→level mapping, live indicator, no-source error state
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.8_

- [x] 5. Match Center: pure logic and components
  - [x] 5.1 Implement match grouping
    - Create `lib/match/grouping.ts` `groupMatches(matches)` partitioning into Live/Upcoming/Completed by status
    - _Requirements: 3.1_
  - [x] 5.2 Write property test for match grouping
    - **Property 3: Match grouping is a complete, correct partition**
    - `// Feature: worldcup-2026-platform, Property 3: For any set of matches, grouping places every match in exactly the bucket matching its status; the multiset union of the three buckets equals the input.`
    - fast-check + Vitest, minimum 100 iterations
    - **Validates: Requirements 3.1**
  - [x] 5.3 Implement standings computation
    - Create `lib/match/standings.ts` computing played/won/drawn/lost/GF/GA/points from completed matches
    - _Requirements: 3.3_
  - [x] 5.4 Write property test for standings arithmetic
    - **Property 4: Standings arithmetic invariants hold**
    - `// Feature: worldcup-2026-platform, Property 4: For any set of completed matches, played == won + drawn + lost, points == 3*won + drawn, and GF/GA equal summed scored/conceded goals.`
    - fast-check + Vitest, minimum 100 iterations
    - **Validates: Requirements 3.3**
  - [x] 5.5 Implement match event ordering
    - Create `lib/match/events.ts` `orderEvents(events)` returning a non-decreasing-by-minute permutation
    - _Requirements: 3.6_
  - [x] 5.6 Write property test for event ordering
    - **Property 5: Live events are ordered by minute**
    - `// Feature: worldcup-2026-platform, Property 5: For any set of match events, the rendered ordering is a permutation of the input that is non-decreasing by minute.`
    - fast-check + Vitest, minimum 100 iterations
    - **Validates: Requirements 3.6**
  - [x] 5.7 Implement Match Center components and pages
    - `components/match-center/`: `MatchList` (grouped), `MatchDetailTabs` (Overview, Summary, Lineups, Formations, Venue, Weather, Referee), `LiveEvents` (client island, interval refresh, ordered by minute), `StandingsTable`, `Bracket`, `PlayerProfile`
    - Wire `(public)/matches`, `matches/[id]`, `standings`, `bracket`, `players/[id]` routes consuming the pure modules and Prisma data
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [x] 5.8 Implement bracket assembly
    - Create `lib/match/bracket.ts` assembling R32, R16, QF, SF, Final from `KnockoutRound`/`Match` data
    - _Requirements: 3.4_
  - [x] 5.9 Write unit tests for bracket assembly
    - Verify all knockout stages assemble in order; handle missing/partial rounds
    - _Requirements: 3.4_

- [x] 6. Theme_Engine (KOORAKIT dark) and branding
  - [x] 6.1 Implement KOORAKIT tokens, ThemeProvider, and dark default
    - Add CSS custom properties (navy/gold/silver/blue tokens) in `globals.css`; wire Tailwind v4 theme config; create `ThemeProvider` applying dark as default
    - Add a pure `resolveTheme(preference, system)` returning `DARK` when no preference is stored
    - _Requirements: 7.2, 7.3, 7.4_
  - [x] 6.2 Implement the contrast utility
    - Create `lib/theme/contrast.ts` computing the WCAG contrast ratio between two color tokens
    - _Requirements: 18.3_
  - [x] 6.3 Write property test for theme contrast
    - **Property 14: Active-theme body text meets WCAG AA contrast**
    - `// Feature: worldcup-2026-platform, Property 14: For any supported theme, the contrast ratio between the body-text token and its background token is at least 4.5:1.`
    - fast-check + Vitest, minimum 100 iterations
    - **Validates: Requirements 18.3**
  - [x] 6.4 Replace placeholder branding with KOORAKIT
    - Replace the "FIFA World Cup 2026™" badge and legacy cyan/green hero palette in `src/app/page.tsx` and root layout with KOORAKIT navy/gold branding and wordmark
    - _Requirements: 7.1, 7.4, 21.1, 21.4_

- [x] 7. CMS core, audit logging, and admin modules
  - [x] 7.1 Implement the audit log service
    - Create `lib/cms/audit.ts` `recordAudit({ actorId, action, entity, entityId })` writing exactly one `AuditLog` row with a timestamp
    - _Requirements: 6.5_
  - [x] 7.2 Write property test for audit logging
    - **Property 16: Content mutations always produce an audit entry**
    - `// Feature: worldcup-2026-platform, Property 16: For any content-modifying CMS action invoked by an authorized actor, exactly one audit-log entry is recorded carrying the actor, action, and timestamp.`
    - fast-check + Vitest, minimum 100 iterations (mock the persistence boundary)
    - **Validates: Requirements 6.5**
  - [x] 7.3 Implement the admin shell, dashboard, and navigation gating
    - Build `(admin)/admin/layout.tsx` with server-side role gate and sidebar; dashboard aggregating live/total streams, users, articles, matches; hide modules per `permittedModules(role)`
    - _Requirements: 6.1, 6.2, 6.4_
  - [x] 7.4 Implement Server Actions for stream/match/tournament CRUD
    - Server Actions that re-check permission via `lib/rbac.ts`, perform Prisma writes, and call `recordAudit` for stream, match, and tournament management
    - _Requirements: 6.3, 6.4, 6.5, 2.1_
  - [x] 7.5 Implement stream source management UI and health display
    - `(admin)/admin/streams` CRUD UI for `StreamSource` (name, URL, quality, language, type, active, `legallyPermitted`, `priority`); display health status from probes; on-demand "probe now" trigger
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 2.6, 21.3_
  - [x] 7.6 Write CRUD round-trip unit tests
    - Verify stream/match create-update-delete persist and produce audit entries
    - _Requirements: 2.1, 6.3, 6.5_

- [x] 8. SEO foundation
  - [x] 8.1 Implement the page metadata builder
    - Create `lib/seo/metadata.ts` producing title, description, canonical (absolute HTTPS), OpenGraph, and Twitter card fields for pages/articles/matches/teams
    - _Requirements: 8.1, 20.3_
  - [x] 8.2 Write property test for page metadata
    - **Property 8: Page metadata is complete with an absolute canonical URL**
    - `// Feature: worldcup-2026-platform, Property 8: For any indexable entity, generated metadata contains non-empty title, description, OpenGraph, and Twitter fields and a canonical URL that is an absolute HTTPS URL.`
    - fast-check + Vitest, minimum 100 iterations
    - **Validates: Requirements 8.1, 20.3**
  - [x] 8.3 Implement JSON-LD structured-data builders
    - Create `lib/seo/jsonld.ts` with pure builders for `Organization`, `SportsEvent`, `Article`, and `FAQPage` (FAQPage consumed in Tier 2 AEO) producing correct `@context`/`@type` and key fields
    - _Requirements: 8.4_
  - [x] 8.4 Write property test for structured-data builders
    - **Property 9: Structured data builders emit valid schema.org objects**
    - `// Feature: worldcup-2026-platform, Property 9: For any supported entity type (Organization, SportsEvent, Article, FAQPage), the JSON-LD builder produces an object with correct @context and @type and includes the entity's key fields.`
    - fast-check + Vitest, minimum 100 iterations
    - **Validates: Requirements 8.4, 13.2, 13.3**
  - [x] 8.5 Wire generateMetadata, sitemap, and robots
    - Add `generateMetadata` to public routes using `lib/seo/metadata.ts`; emit Organization JSON-LD in root layout and SportsEvent/Article JSON-LD on detail pages; implement `app/sitemap.ts` and `app/robots.ts`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 20.3_

- [x] 9. Home page
  - [x] 9.1 Implement the home page
    - Hero with live countdown to a configured target date and Watch Live / Explore Matches CTAs; sections for Live Now, Upcoming Matches, Latest News, Group Tables, Knockout Brackets
    - Watch Live navigates to a live match or live listing; render explicit empty state when no live matches exist
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 10. Checkpoint — Tier 1 logic and pages
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Tier 1 deployment artifacts and build integrity
  - [x] 11.1 Add Vercel config and environment template
    - Create `vercel.json` (build, regions, headers, cron for health probes) and `.env.example` documenting `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `EMAIL_SERVER`, GA4/GTM/AdSense IDs, and optional Redis vars
    - _Requirements: 9.4_
  - [x] 11.2 Add Docker artifacts
    - Create a multi-stage `Dockerfile` (Next.js standalone build) and `docker-compose.yml` (app + PostgreSQL); ensure `next.config.ts` enables standalone output
    - _Requirements: 9.5_
  - [x] 11.3 Verify Tier 1 build, lint, and type-check
    - Run `next build`, `eslint`, and `tsc --noEmit`; fix errors so all pass; run `prisma validate`
    - _Requirements: 9.1, 9.2, 9.3, 4.4_

- [x] 12. **[TIER 2]** News and content system
  - [x] 12.1 Implement slug generation
    - Create `lib/content/slug.ts` `slugify(title)` producing URL-safe, idempotent slugs matching `^[a-z0-9]+(?:-[a-z0-9]+)*$`
    - _Requirements: 11.4_
  - [x] 12.2 Write property test for slug generation
    - **Property 10: Slug generation is URL-safe and idempotent**
    - `// Feature: worldcup-2026-platform, Property 10: For any article title, the generated slug matches ^[a-z0-9]+(?:-[a-z0-9]+)*$, and slugify applied to an already-generated slug returns the same slug.`
    - fast-check + Vitest, minimum 100 iterations
    - **Validates: Requirements 11.4**
  - [x] 12.3 Implement related-article selection
    - Create `lib/content/related.ts` `relatedArticles(article, corpus)` returning articles sharing a category or tag and excluding self
    - _Requirements: 11.5_
  - [x] 12.4 Write property test for related articles
    - **Property 11: Related articles share a category or tag and exclude self**
    - `// Feature: worldcup-2026-platform, Property 11: For any article and corpus, every related article shares at least one category or tag with the source and is never the source article itself.`
    - fast-check + Vitest, minimum 100 iterations
    - **Validates: Requirements 11.5**
  - [x] 12.5 Implement Content_Editor, article pages, and sharing
    - `(admin)/admin/content` rich-text authoring (create/edit/delete) with the 6 categories, tags, and SEO metadata; publish at slug-based URL; public `(public)/news` list and `news/[slug]` detail showing related articles and social sharing controls
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  - [x] 12.6 Write CRUD/edge-case unit tests for articles
    - Slug collision deduplication, publish toggle, related rendering
    - _Requirements: 11.1, 11.4, 11.5_

- [x] 13. **[TIER 2]** Advanced animation and 3D experience
  - [x] 13.1 Implement scroll/transition animations and smooth scroll
    - framer-motion scroll-triggered animations on hero/match cards; page/modal/card transitions; Lenis smooth scrolling on public pages; Lottie loading-state animations; lazy-load animation wrappers
    - _Requirements: 12.1, 12.2, 12.4, 12.5_
  - [x] 13.2 Implement the 3D homepage hero scene
    - R3F/Drei scene with stadium, trophy, and particle effects, dynamically imported and capability-gated
    - _Requirements: 12.3_

- [x] 14. **[TIER 2]** AEO optimization
  - [x] 14.1 Implement FAQ/entity admin and FAQ structured data
    - `(admin)/admin/faq` to manage FAQ entries and entity metadata; render FAQ content blocks with `FAQPage` JSON-LD via `lib/seo/jsonld.ts`
    - _Requirements: 13.2, 13.4_
  - [x] 14.2 Render semantic HTML and entity-relationship structured data
    - Apply semantic landmarks to primary content sections; emit entity-relationship JSON-LD for teams, players, and matches
    - _Requirements: 13.1, 13.3_

- [x] 15. **[TIER 2]** Analytics and advertising
  - [x] 15.1 Implement ad counter accumulation
    - Create `lib/ads/counters.ts` applying impression/click events to stored counters
    - _Requirements: 14.5_
  - [x] 15.2 Write property test for ad counters
    - **Property 12: Ad counters accumulate exactly**
    - `// Feature: worldcup-2026-platform, Property 12: For any sequence of impression and click events, the stored impressions and clicks counters equal the number of impression and click events respectively.`
    - fast-check + Vitest, minimum 100 iterations
    - **Validates: Requirements 14.5**
  - [x] 15.3 Integrate GA4/GTM, video events, and ads manager
    - Inject GA4 + GTM via App Router script strategy with page-view events; emit video-view events from the player to `POST /api/analytics/video`; `(admin)/admin/ads` managing banner/in-article/video placements; `POST /api/ads/[id]/event` atomically incrementing impression/click counters via `lib/ads/counters.ts`
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 16. Checkpoint — Tier 2
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. **[TIER 3]** Advanced playback features
  - [x] 17.1 Implement casting, PiP, and multi-audio controls
    - Add `components/player/cast/` controls for Picture-in-Picture, AirPlay, Chromecast, and audio-track selection, each rendered only when the runtime/device exposes the capability
    - _Requirements: 15.1, 15.2, 15.3, 15.4_
  - [x] 17.2 Write unit tests for capability-gated controls
    - Verify each control renders only when its capability is present
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [x] 18. **[TIER 3]** Light mode and caching
  - [x] 18.1 Implement light mode and theme persistence
    - Add the parallel light token set and theme switcher; extend `resolveTheme(preference, system)` for light/dark; persist selection via cookie + `localStorage`, applied before paint
    - _Requirements: 16.1, 16.2_
  - [x] 18.2 Write property test for theme persistence round-trip
    - **Property 13: Theme selection round-trips through persistence**
    - `// Feature: worldcup-2026-platform, Property 13: For any selected theme mode, persisting and then resolving the active theme returns the selected mode, and with no stored preference the resolved theme is dark.`
    - fast-check + Vitest, minimum 100 iterations
    - **Validates: Requirements 16.2, 7.2**
  - [x] 18.3 Implement optional Redis caching with fallback
    - Add an Upstash Redis cache layer for hot reads (standings, fixtures) that gracefully falls back to ISR/in-process behavior when unconfigured
    - _Requirements: 16.3, 17.4_

- [x] 19. Finalization — audit and full verification
  - [x] 19.1 Branding and asset compliance audit
    - Scan the repository for FIFA logos/marks/official branding and bundled copyrighted broadcast assets; confirm only KOORAKIT custom logo/theme assets are used and that IPTV ingestion is restricted to `legallyPermitted` sources
    - _Requirements: 7.1, 21.1, 21.2, 21.3, 21.4_
  - [x] 19.2 Full build, lint, and type-check verification
    - Run `next build`, `eslint`, `tsc --noEmit`, `vitest run`, and `prisma validate`; confirm presence of `vercel.json`, `.env.example`, `Dockerfile`, `docker-compose.yml`; fix any failures
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each correctness property is implemented by a single `fast-check` + Vitest property test (minimum 100 iterations), tagged with `// Feature: worldcup-2026-platform, Property {number}: {property_text}`, placed beside its pure `lib/` module.
- **[TIER 2]** and **[TIER 3]** prefixes mark tasks beyond the shippable MVP slice (Tier 1 = tasks 1–11).
- Property 9's `FAQPage` builder is implemented in Tier 1 (task 8.3) but consumed by AEO in Tier 2 (task 14.1); the single property test in 8.4 covers all supported types.
- Each task references specific requirement sub-clauses for traceability; checkpoints (tasks 10, 16) provide incremental validation gates.
- No task pushes to GitHub or performs a live Vercel deploy; deployment is performed outside task execution using the artifacts produced in tasks 11 and 19.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "3.3", "3.5", "4.1", "4.3", "4.5", "5.1", "5.3", "5.5", "5.8", "6.1", "6.2", "7.1", "8.1", "8.3"] },
    { "id": 3, "tasks": ["2.3", "3.2", "3.4", "3.6", "3.7", "4.2", "4.4", "5.2", "5.4", "5.6", "6.3", "6.4", "7.2", "8.2", "8.4"] },
    { "id": 4, "tasks": ["3.8", "3.9", "4.6", "5.7", "5.9", "7.3", "8.5"] },
    { "id": 5, "tasks": ["4.7", "4.8", "7.4", "9.1"] },
    { "id": 6, "tasks": ["7.5", "7.6", "11.1", "11.2"] },
    { "id": 7, "tasks": ["11.3", "12.1", "12.3", "15.1"] },
    { "id": 8, "tasks": ["12.2", "12.4", "12.5", "13.1", "13.2", "14.1", "14.2", "15.2", "15.3"] },
    { "id": 9, "tasks": ["12.6", "17.1", "18.1", "18.3"] },
    { "id": 10, "tasks": ["17.2", "18.2", "19.1"] },
    { "id": 11, "tasks": ["19.2"] }
  ]
}
```
