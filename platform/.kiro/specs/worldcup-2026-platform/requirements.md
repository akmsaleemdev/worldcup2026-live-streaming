# Requirements Document

## Introduction

The World Cup 2026 Platform is a premium, production-ready sports streaming and news web platform themed around the 2026 World Cup football tournament. It combines a fully custom live streaming experience, a tournament match center, a news/content system, and an enterprise content management system (CMS) with role-based administration, SEO/AEO optimization, analytics, and advertising.

The platform is built in the existing `platform/` Next.js application (Next.js App Router, React 19, TypeScript, Tailwind CSS, Prisma ORM). The production database target is PostgreSQL. The platform MUST NOT use any FIFA logos, trademarks, official branding, or copyrighted assets; it uses a custom theme with a custom logo (to be provided later) from which the color palette is derived.

Because the scope is large, requirements are organized into three priority tiers so delivery can be phased:

- **Tier 1 — MUST have (core MVP):** streaming player, match center, data model + database, admin CMS basics, authentication/RBAC, SEO basics, deployment.
- **Tier 2 — SHOULD have:** news system, advanced animations/3D, AEO optimization, analytics, advertising.
- **Tier 3 — COULD have:** Chromecast/AirPlay/multi-audio, light mode, Redis caching, advanced motion effects.

Non-functional requirements (performance, accessibility, security, SEO targets, legality/branding) apply across all tiers and are captured explicitly.

This document covers requirements only. Technical design and implementation tasks are produced in later phases.

## Glossary

- **Platform**: The complete World Cup 2026 web application built in `platform/`.
- **Streaming_Player**: The custom React-based video player component (HLS.js + Video.js) that plays live and recorded streams without an iframe/embed.
- **Match_Center**: The set of pages and components presenting matches, tables, knockout brackets, and player data.
- **CMS**: The administrative content management system and admin dashboard.
- **Stream_Source**: A configured IPTV/HLS stream origin (e.g., an M3U8 playlist entry) used to serve a match stream.
- **Stream_Health_Monitor**: The subsystem that probes and reports the availability/status of configured streams.
- **Content_Editor**: The rich-text authoring interface used to create and edit news articles.
- **RBAC_Service**: The role-based access control subsystem enforcing permissions per user role.
- **Theme_Engine**: The subsystem managing color palette, dark/light mode, and logo-derived color extraction.
- **SEO_Service**: The subsystem generating metadata, structured data, sitemaps, and robots directives.
- **AEO_Service**: The subsystem optimizing content for AI answer engines (FAQ blocks, entity data, structured data).
- **Analytics_Service**: The subsystem integrating GA4, Google Tag Manager, AdSense, and Search Console.
- **Role**: One of Super Admin, Admin, Editor, Moderator, Analyst, User.
- **User**: An authenticated or anonymous visitor of the Platform.
- **EARS**: Easy Approach to Requirements Syntax, the format used for acceptance criteria.
- **Lighthouse**: Google's automated quality auditing tool reporting scores for Performance, Accessibility, Best Practices, and SEO.

## Open Questions (require user input before or during Design)

1. **Custom logo** — RESOLVED: The official custom logo has been provided. The brand/product name is **KOORAKIT** ("World Cup 2026 — The Global Football Festival"). The logo is original artwork (globe, trophy, star, and USA/Mexico flag motifs) and is NOT FIFA branding; Requirement 21 still applies. The Theme_Engine default dark palette is derived from the logo: Primary Deep Navy/Royal Blue `#0A1A3F`–`#14264F`; Accent Gold/Champagne `#D4AF37`/`#C9A227`; Secondary Silver/White `#E8EAED`/`#FFFFFF`; Tertiary Bright Blue `#1E40AF`. The placeholder "FIFA World Cup 2026™" text in `src/app/page.tsx` is replaced with KOORAKIT branding. See design.md (Theming & Theme_Engine) for tokens.
2. **IPTV source legality**: Which IPTV/M3U8 sources are confirmed legally permitted for redistribution in the target regions? This constrains the streaming feature scope.
3. **Legacy Express app**: Should the legacy Express + EJS + SQLite aggregator (`src/server.js`, `scripts/*`) be retired, kept running in parallel, or have its data migrated into the new platform?
4. **Next.js version**: The master prompt specifies Next.js 15, but the installed platform uses Next.js 16.2.9. Confirm targeting the installed Next.js 16, or downgrade to 15.
5. **Data sources**: What are the authoritative data sources for fixtures, results, standings, player statistics, and odds (existing `data/*.json`, a third-party sports API, or manual CMS entry)?
6. **Authentication providers**: Confirm email + Google are the only initial login methods; any others (Apple, GitHub)?
7. **Hosting/Redis**: Confirm Vercel as the deploy target and whether a managed Redis (e.g., Upstash) is available for caching.

## Requirements

### Requirement 1: Custom Live Streaming Player (Tier 1 — MUST)

**User Story:** As a viewer, I want to watch live match streams in a fully custom player, so that I can follow matches with broadcast-quality controls without third-party embeds.

#### Acceptance Criteria

1. THE Streaming_Player SHALL render video using HLS.js and Video.js without using an iframe or third-party embed.
2. WHEN a stream URL uses HLS or M3U8 format, THE Streaming_Player SHALL play the stream using adaptive bitrate selection.
3. WHEN a User selects a quality option, THE Streaming_Player SHALL switch to the selected bitrate variant.
4. THE Streaming_Player SHALL provide play, pause, volume, fullscreen, and seek controls.
5. WHILE a stream is live, THE Streaming_Player SHALL display a live indicator.
6. WHILE a live stream supports DVR, THE Streaming_Player SHALL allow the User to seek backward within the available buffer window.
7. IF the active Stream_Source fails to load within 10 seconds, THEN THE Streaming_Player SHALL switch to the next available backup Stream_Source for the match.
8. IF no working Stream_Source is available for a match, THEN THE Streaming_Player SHALL display an error message identifying that no stream is available.

### Requirement 2: Stream Source Management and Health (Tier 1 — MUST)

**User Story:** As an administrator, I want to manage IPTV stream sources and monitor their health, so that viewers always have a working stream.

#### Acceptance Criteria

1. THE CMS SHALL allow an administrator to create, edit, and delete Stream_Sources associated with a match.
2. THE Stream_Source record SHALL store source name, stream URL, quality, language, type, and active status.
3. WHEN the Stream_Health_Monitor probes a Stream_Source, THE Platform SHALL record whether the source responded successfully.
4. WHERE multiple Stream_Sources exist for a match, THE Platform SHALL designate an ordered failover sequence of backup sources.
5. THE CMS SHALL display the current health status of each Stream_Source.
6. WHERE a Stream_Source is configured from an IPTV playlist, THE Platform SHALL only ingest sources marked as legally permitted.

### Requirement 3: Match Center (Tier 1 — MUST)

**User Story:** As a fan, I want to browse matches, tables, brackets, and player data, so that I can follow the tournament.

#### Acceptance Criteria

1. THE Match_Center SHALL list matches grouped by status as Live, Upcoming, and Completed.
2. WHEN a User opens a match, THE Match_Center SHALL display tabs for Overview, Summary, Lineups, Formations, Venue, Weather, and Referee.
3. THE Match_Center SHALL display group standings tables showing played, won, drawn, lost, goals for, goals against, and points per team.
4. THE Match_Center SHALL display knockout brackets for Round of 32, Round of 16, Quarter-Finals, Semi-Finals, and Final.
5. WHEN a User opens a player profile, THE Match_Center SHALL display the player's statistics including goals, assists, yellow cards, and red cards.
6. WHILE a match status is live, THE Match_Center SHALL display real-time match events ordered by minute.

### Requirement 4: Data Model and Database (Tier 1 — MUST)

**User Story:** As a developer, I want a complete relational data model on PostgreSQL, so that all platform entities are persisted with integrity.

#### Acceptance Criteria

1. THE Platform SHALL define data models for users, roles, teams, players, matches, match events, groups, standings, knockout rounds, streams, articles, categories, tags, media, advertisements, analytics, notifications, SEO metadata, and settings.
2. THE Platform SHALL use PostgreSQL as the production datasource through Prisma ORM.
3. THE Platform SHALL define foreign key constraints between related entities.
4. THE Platform SHALL provide database migrations for the schema.
5. THE Platform SHALL provide seed data for initial teams, groups, and settings.
6. WHEN a referenced parent record is deleted, THE Platform SHALL enforce the configured cascade or restrict behavior on dependent records.

### Requirement 5: Authentication and Role-Based Access Control (Tier 1 — MUST)

**User Story:** As a platform owner, I want authenticated users with distinct roles, so that access to administrative functions is controlled.

#### Acceptance Criteria

1. THE Platform SHALL authenticate users using NextAuth with email and Google sign-in.
2. THE RBAC_Service SHALL support the roles Super Admin, Admin, Editor, Moderator, Analyst, and User.
3. WHEN a User without sufficient role permission requests a protected admin resource, THE RBAC_Service SHALL deny access and return an authorization error.
4. THE Platform SHALL issue authenticated sessions using JWT.
5. WHEN a User signs in successfully, THE Platform SHALL assign the User the default role of User unless a higher role is already assigned.
6. THE RBAC_Service SHALL map each Role to a defined set of permitted CMS actions.

### Requirement 6: Admin Dashboard and CMS Core (Tier 1 — MUST)

**User Story:** As an administrator, I want a central dashboard and content management modules, so that I can operate the platform.

#### Acceptance Criteria

1. THE CMS SHALL provide a dashboard summarizing streams, users, and content counts.
2. THE CMS SHALL provide modules for Content Management, Streaming Management, Match Management, and Tournament Management.
3. WHEN an authorized administrator creates, updates, or deletes a managed entity, THE CMS SHALL persist the change to the database.
4. WHERE a User lacks permission for a CMS module, THE CMS SHALL hide or disable that module for that User.
5. WHEN an administrator performs a content-modifying action, THE CMS SHALL record an audit log entry containing the actor, action, and timestamp.

### Requirement 7: Theming and Branding (Tier 1 — MUST)

**User Story:** As a brand owner, I want a custom theme derived from a provided logo, so that the platform has consistent original branding without infringing trademarks.

#### Acceptance Criteria

1. THE Platform SHALL NOT include FIFA logos, trademarks, official branding, or copyrighted assets.
2. THE Theme_Engine SHALL apply a premium dark mode as the default theme.
3. WHEN a custom logo is provided, THE Theme_Engine SHALL derive a color palette from the logo and apply it across the site, player, and admin interfaces.
4. THE Theme_Engine SHALL apply the active palette consistently across public pages, the CMS, and the Streaming_Player.

### Requirement 8: SEO Foundation (Tier 1 — MUST)

**User Story:** As a marketer, I want core SEO features, so that the platform is discoverable by search engines.

#### Acceptance Criteria

1. THE SEO_Service SHALL generate per-page metadata including title, description, canonical URL, OpenGraph tags, and Twitter card tags.
2. THE SEO_Service SHALL generate an XML sitemap covering public pages.
3. THE SEO_Service SHALL generate a robots.txt directive file.
4. THE SEO_Service SHALL emit structured data for Organization, SportsEvent, and Article entities.

### Requirement 9: Deployment and Build Integrity (Tier 1 — MUST)

**User Story:** As a DevOps engineer, I want the platform to build and deploy reliably, so that releases reach production safely.

#### Acceptance Criteria

1. WHEN the build command is run, THE Platform SHALL complete the production build without errors.
2. WHEN the lint command is run, THE Platform SHALL complete without errors.
3. WHEN the type-check is run, THE Platform SHALL complete without type errors.
4. THE Platform SHALL provide deployment configuration for Vercel including a vercel.json file and environment variable templates.
5. THE Platform SHALL provide a Dockerfile and docker-compose configuration for containerized local operation.

### Requirement 10: Home Page (Tier 1 — MUST)

**User Story:** As a visitor, I want an engaging home page, so that I can quickly find live matches, news, and tournament information.

#### Acceptance Criteria

1. THE Platform SHALL display a home page hero with a live countdown to a configured target date and primary calls to action labeled Watch Live and Explore Matches.
2. THE home page SHALL display sections for Live Now, Upcoming Matches, Latest News, Group Tables, and Knockout Brackets.
3. WHEN a User selects the Watch Live call to action, THE Platform SHALL navigate to a live match or the live match listing.
4. WHEN no live matches exist, THE home page SHALL indicate that no matches are currently live.

### Requirement 11: News and Content System (Tier 2 — SHOULD)

**User Story:** As an editor, I want to author and publish news articles, so that readers get tournament coverage.

#### Acceptance Criteria

1. THE Content_Editor SHALL allow an authorized editor to create, edit, and delete articles with rich text content.
2. THE Platform SHALL support article categories including Breaking News, Match Reports, Team News, Injury Reports, Tactical Analysis, and Press Conferences.
3. THE Platform SHALL support assigning tags and SEO metadata to articles.
4. WHEN an article is published, THE Platform SHALL make it accessible at a unique slug-based URL.
5. WHEN an article is displayed, THE Platform SHALL show related articles based on shared categories or tags.
6. WHERE an article has social sharing enabled, THE Platform SHALL render social sharing controls.

### Requirement 12: Advanced Animation and 3D Experience (Tier 2 — SHOULD)

**User Story:** As a visitor, I want premium motion and 3D visuals, so that the platform feels modern and immersive.

#### Acceptance Criteria

1. THE Platform SHALL apply scroll-triggered animations to hero and match card sections.
2. THE Platform SHALL apply page, modal, and card transition animations.
3. WHERE 3D rendering is enabled, THE Platform SHALL render a 3D homepage hero scene including a stadium, trophy, and particle effects.
4. THE Platform SHALL apply smooth scrolling to public pages.
5. WHILE animated content loads, THE Platform SHALL display loading-state animations.

### Requirement 13: AEO Optimization (Tier 2 — SHOULD)

**User Story:** As a content strategist, I want answer-engine optimization, so that the platform surfaces in AI search results.

#### Acceptance Criteria

1. THE Platform SHALL render semantic HTML for primary content sections.
2. THE AEO_Service SHALL render FAQ content blocks with FAQ structured data.
3. THE AEO_Service SHALL emit entity relationship structured data for teams, players, and matches.
4. THE Platform SHALL provide an admin interface to manage FAQ entries and entity metadata.

### Requirement 14: Analytics and Advertising (Tier 2 — SHOULD)

**User Story:** As a growth manager, I want analytics and advertising integrations, so that I can measure engagement and generate revenue.

#### Acceptance Criteria

1. THE Analytics_Service SHALL integrate Google Analytics 4 and emit page view events.
2. THE Analytics_Service SHALL integrate Google Tag Manager.
3. WHEN a video stream is viewed, THE Analytics_Service SHALL emit a video view event.
4. THE CMS SHALL allow an administrator to manage advertisement placements including banner, in-article, and video ad slots.
5. WHEN an advertisement is displayed or clicked, THE Platform SHALL increment the corresponding impression or click counter.

### Requirement 15: Advanced Playback Features (Tier 3 — COULD)

**User Story:** As a viewer, I want casting and multi-audio options, so that I can watch on more devices and in my preferred language.

#### Acceptance Criteria

1. WHERE the viewing device supports Picture-in-Picture, THE Streaming_Player SHALL provide a Picture-in-Picture control.
2. WHERE the viewing environment supports AirPlay, THE Streaming_Player SHALL provide an AirPlay control.
3. WHERE the viewing environment supports Chromecast, THE Streaming_Player SHALL provide a Chromecast control.
4. WHERE a stream provides multiple audio tracks, THE Streaming_Player SHALL allow the User to select an audio track.

### Requirement 16: Light Mode and Caching (Tier 3 — COULD)

**User Story:** As a returning user, I want a light theme and fast repeat loads, so that I can use my preferred appearance with high performance.

#### Acceptance Criteria

1. THE Theme_Engine SHALL provide an optional light mode selectable via a theme switcher.
2. WHEN a User selects a theme, THE Platform SHALL persist the selection across sessions.
3. WHERE a caching layer is configured, THE Platform SHALL serve cacheable responses from the cache.

## Non-Functional Requirements

### Requirement 17: Performance

**User Story:** As a visitor, I want fast page loads, so that I have a smooth experience.

#### Acceptance Criteria

1. WHEN a public page is audited with Lighthouse, THE Platform SHALL achieve a Performance score of at least 90.
2. THE Platform SHALL apply image optimization to served images.
3. THE Platform SHALL apply code splitting and lazy loading to non-critical components.
4. WHERE incremental static regeneration is configured for a page, THE Platform SHALL serve a statically generated response that revalidates on the configured interval.

### Requirement 18: Accessibility

**User Story:** As a user with assistive technology, I want accessible pages, so that I can use the platform.

#### Acceptance Criteria

1. WHEN a public page is audited with Lighthouse, THE Platform SHALL achieve an Accessibility score of at least 90.
2. THE Platform SHALL provide accessible names for interactive controls including Streaming_Player controls.
3. THE Platform SHALL maintain text color contrast meeting WCAG AA for body text in the active theme.

### Requirement 19: Security

**User Story:** As a platform owner, I want strong security controls, so that user data and the system are protected.

#### Acceptance Criteria

1. THE Platform SHALL send a Content Security Policy header on responses.
2. THE Platform SHALL set secure attributes on authentication cookies.
3. WHEN database queries include user-supplied values, THE Platform SHALL use parameterized queries through the ORM.
4. WHEN a request exceeds the configured rate limit for an endpoint, THE Platform SHALL reject the request with a rate-limit error.
5. THE Platform SHALL send security headers including protections against cross-site scripting and clickjacking.

### Requirement 20: SEO and Best Practices Targets

**User Story:** As a marketer, I want top audit scores, so that the platform ranks and behaves well.

#### Acceptance Criteria

1. WHEN a public page is audited with Lighthouse, THE Platform SHALL achieve an SEO score of at least 90.
2. WHEN a public page is audited with Lighthouse, THE Platform SHALL achieve a Best Practices score of at least 90.
3. THE Platform SHALL provide canonical URLs for all indexable public pages.

### Requirement 21: Legality and Branding Compliance

**User Story:** As a legal stakeholder, I want strict compliance with branding and content rules, so that the platform avoids infringement.

#### Acceptance Criteria

1. THE Platform SHALL NOT display FIFA logos, trademarks, or official branding.
2. THE Platform SHALL NOT bundle copyrighted broadcast assets in the repository.
3. WHERE an IPTV source is ingested, THE Platform SHALL restrict ingestion to sources designated as legally permitted in the source configuration.
4. THE Platform SHALL use only the custom logo and custom theme assets for branding.
