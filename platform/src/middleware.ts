/**
 * Edge middleware: auth gate + security headers + rate-limit wiring.
 *
 * Implements:
 * - Req 5.3  — deny under-privileged/unauthenticated access to protected admin
 *   resources (401 unauthenticated, 403 insufficient role).
 * - Req 19.1 — send a Content-Security-Policy header on responses.
 * - Req 19.4 — reject requests that exceed the configured per-endpoint rate
 *   limit (HTTP 429 + `Retry-After`).
 * - Req 19.5 — send security headers protecting against XSS and clickjacking.
 *
 * Edge-runtime constraints (this file runs on the Edge runtime):
 * - We import ONLY edge-compatible, dependency-free helpers: `getToken`
 *   (next-auth/jwt, edge-safe), the pure `can` resolver from `lib/rbac.ts`,
 *   and the pure `checkRateLimit` decision from `lib/security/rate-limit.ts`.
 * - We intentionally DO NOT import `lib/auth/options.ts` (it pulls in the
 *   Prisma client and `node:crypto`, which are not available on the Edge
 *   runtime). The session secret and secure-cookie flag are read directly so
 *   `getToken` can decode the same signed cookie that `options.ts` issues.
 */
import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

import { can, type Role } from "@/lib/rbac";
import {
  checkRateLimit,
  type RateLimitState,
} from "@/lib/security/rate-limit";

/**
 * Page-route prefix that requires authentication AND `admin:access`.
 * Unauthenticated requests are redirected to NextAuth sign-in; authenticated
 * requests lacking the permission receive a 403.
 */
const PROTECTED_PAGE_PREFIX = "/admin";

/**
 * API-route prefixes that require authentication AND `admin:access`.
 * Unauthenticated requests receive 401 JSON; under-privileged requests 403 JSON.
 * (`/api/auth` is owned by NextAuth and is excluded from the matcher below.)
 */
const PROTECTED_API_PREFIXES: readonly string[] = ["/api/admin"];

/**
 * Per-endpoint rate-limit rules, matched by path prefix. The first matching
 * rule applies. Limits are deliberately modest defaults; tune per deployment.
 *
 * Note on the "auth" category (Req 19.4): NextAuth owns `/api/auth/*` and the
 * matcher excludes it (intercepting those routes risks breaking sign-in / CSRF
 * / callback flows). Auth-endpoint throttling is therefore expressed as a rule
 * here but only takes effect for any FIRST-PARTY auth endpoint we add outside
 * `/api/auth` (e.g. a future `/api/account/*`); the NextAuth core stays
 * untouched. Stream / ad / analytics endpoints are first-party and rate limited.
 */
interface RateLimitRule {
  /** Logical category, used purely for documentation/keying. */
  category: "stream" | "ad" | "analytics";
  /** Path prefix this rule applies to. */
  prefix: string;
  /** Max requests admitted per window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

const RATE_LIMIT_RULES: readonly RateLimitRule[] = [
  { category: "stream", prefix: "/api/stream", limit: 60, windowMs: 60_000 },
  { category: "ad", prefix: "/api/ads", limit: 60, windowMs: 60_000 },
  {
    category: "analytics",
    prefix: "/api/analytics",
    limit: 120,
    windowMs: 60_000,
  },
];

/**
 * Per-IP in-memory rate-limit store, keyed by `"<ip>:<rule-prefix>"`.
 *
 * SERVERLESS CAVEAT: this Map lives in a single Edge/Lambda instance's memory.
 * Under horizontal scaling each instance keeps its own counters, so the global
 * limit is effectively `limit × instanceCount`. For strict, cluster-wide limits
 * replace this with a shared store (the Redis seam — see `RateLimitStore` in
 * `lib/security/rate-limit.ts`). The pure `checkRateLimit` decision is reused
 * unchanged; only the backing store differs.
 */
const rateLimitStore = new Map<string, RateLimitState>();

/**
 * Build the Content-Security-Policy. We allow `'unsafe-inline'` for scripts and
 * styles because Next.js App Router injects inline bootstrap/hydration scripts
 * and inline styles, and a nonce-based strict CSP is not wired yet. This is the
 * documented, functional trade-off (Req 19.1). In development we additionally
 * allow `'unsafe-eval'` and websocket connections for React Fast Refresh / HMR.
 *
 * Allowed analytics origins (GA/GTM) are permitted for script and connect so
 * client analytics can load once configured.
 */
function buildContentSecurityPolicy(isDev: boolean): string {
  const ga = "https://www.googletagmanager.com https://www.google-analytics.com";
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'", // Next.js inline bootstrap/hydration scripts
    ...(isDev ? ["'unsafe-eval'"] : []), // React Fast Refresh in dev only
    ga,
  ].join(" ");
  const connectSrc = [
    "'self'",
    ga,
    ...(isDev ? ["ws:", "wss:"] : []), // HMR websocket in dev only
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'", // Tailwind/inline styles
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "media-src 'self' blob: https:", // HLS stream segments
    "frame-src 'self' https:", // embedded stream/players
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'", // clickjacking protection (mirrors X-Frame-Options)
    "upgrade-insecure-requests",
  ].join("; ");
}

/**
 * Attach CSP and the standard security headers to `response` (Req 19.1, 19.5).
 * Applied to every response that flows through this middleware.
 */
function withSecurityHeaders(response: NextResponse): NextResponse {
  const isDev = process.env.NODE_ENV !== "production";
  response.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy(isDev),
  );
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin",
  );
  // HSTS: only meaningful over HTTPS; harmless to send and ignored on http.
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  );
  return response;
}

/** Whether `pathname` is at or under `prefix` (segment-aware). */
function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Best-effort client IP from forwarding headers (NextRequest has no `.ip`). */
function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Apply the first matching rate-limit rule for `pathname`. Returns a 429
 * response (with `Retry-After`) when the limit is exceeded, or `null` to allow
 * the request to proceed.
 */
function enforceRateLimit(
  request: NextRequest,
  pathname: string,
): NextResponse | null {
  const rule = RATE_LIMIT_RULES.find((r) => isUnder(pathname, r.prefix));
  if (!rule) {
    return null;
  }

  const key = `${clientIp(request)}:${rule.prefix}`;
  const now = Date.now();
  const prior = rateLimitStore.get(key);
  const result = checkRateLimit(prior, now, rule.limit, rule.windowMs);
  rateLimitStore.set(key, result.nextState);

  if (result.allowed) {
    return null;
  }

  const retryAfterSec = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
  const response = NextResponse.json(
    { error: "rate_limited", message: "Too many requests." },
    { status: 429 },
  );
  response.headers.set("Retry-After", String(retryAfterSec));
  return response;
}

/**
 * Decode the NextAuth session JWT from the request cookies. Returns the role
 * carried in the token, or `null` when there is no valid session.
 *
 * `secureCookie` mirrors `lib/auth/options.ts` (Secure cookies + `__Secure-`
 * prefix in production) so `getToken` reads the correct cookie name.
 */
async function getSessionRole(request: NextRequest): Promise<Role | null> {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });
  if (!token) {
    return null;
  }
  return ((token as { role?: Role }).role ?? "USER") as Role;
}

/** Build the NextAuth sign-in redirect, preserving the intended destination. */
function signInRedirect(request: NextRequest): NextResponse {
  const signInUrl = new URL("/api/auth/signin", request.url);
  signInUrl.searchParams.set(
    "callbackUrl",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(signInUrl);
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // 1) Rate limiting for first-party API groups (Req 19.4). Applied before the
  //    auth gate so abusive traffic is shed early.
  const limited = enforceRateLimit(request, pathname);
  if (limited) {
    return withSecurityHeaders(limited);
  }

  const isProtectedPage = isUnder(pathname, PROTECTED_PAGE_PREFIX);
  const isProtectedApi = PROTECTED_API_PREFIXES.some((p) =>
    isUnder(pathname, p),
  );

  // 2) Auth + RBAC gate for protected pages/APIs (Req 5.3).
  if (isProtectedPage || isProtectedApi) {
    const role = await getSessionRole(request);

    // Unauthenticated.
    if (role === null) {
      if (isProtectedApi) {
        return withSecurityHeaders(
          NextResponse.json(
            { error: "unauthorized", message: "Authentication required." },
            { status: 401 },
          ),
        );
      }
      return withSecurityHeaders(signInRedirect(request));
    }

    // Authenticated but insufficient role.
    if (!can(role, "admin:access")) {
      if (isProtectedApi) {
        return withSecurityHeaders(
          NextResponse.json(
            { error: "forbidden", message: "Insufficient permissions." },
            { status: 403 },
          ),
        );
      }
      return withSecurityHeaders(
        new NextResponse("Forbidden", { status: 403 }),
      );
    }
  }

  // 3) Allowed: forward with security headers attached (Req 19.1, 19.5).
  return withSecurityHeaders(NextResponse.next());
}

/**
 * Matcher: run on application routes so security headers reach every response,
 * while explicitly excluding routes that must not be intercepted/decorated:
 * - `api/auth/*` — owned by NextAuth (sign-in, CSRF, callbacks, session).
 * - `_next/static`, `_next/image`, `favicon.ico` — framework/static assets.
 * - any path ending in a file extension (e.g. `.js`, `.css`, `.png`, `.svg`).
 *
 * This pattern covers `/admin/:path*` and the rate-limited/protected `/api`
 * paths (`/api/admin`, `/api/stream`, `/api/ads`, `/api/analytics`) while
 * leaving the NextAuth core alone.
 */
export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)",
  ],
};
