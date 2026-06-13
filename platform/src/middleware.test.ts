import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

import { middleware } from "./middleware";

// Unit tests for the Edge middleware's security-header behavior.
//
// _Validates: Requirements 19.1, 19.5_
//
// `withSecurityHeaders` is an internal helper, so we exercise it end-to-end by
// invoking the exported `middleware` against an UNPROTECTED, non-rate-limited
// path (`/matches`). That route flows straight to `withSecurityHeaders(
// NextResponse.next())` without touching auth (`getToken`) or the rate limiter,
// keeping the test Edge-safe — no Prisma client or `lib/auth/options` import is
// pulled in.

/** Build a minimal GET NextRequest for an in-app path. */
function makeRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost"), { method: "GET" });
}

describe("middleware security headers (Req 19.1, 19.5)", () => {
  it("sends a Content-Security-Policy header on responses (Req 19.1)", async () => {
    const res = await middleware(makeRequest("/matches"));

    const csp = res.headers.get("Content-Security-Policy");
    expect(csp).toBeTruthy();
    // Core directives that must always be present regardless of dev/prod mode.
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it("sends clickjacking protections via X-Frame-Options and frame-ancestors (Req 19.5)", async () => {
    const res = await middleware(makeRequest("/matches"));

    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    );
  });

  it("sends XSS/sniffing protections and the standard hardening headers (Req 19.5)", async () => {
    const res = await middleware(makeRequest("/matches"));

    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(res.headers.get("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
    expect(res.headers.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    );
  });

  it("attaches the security headers to every allowed response (multiple paths)", async () => {
    for (const path of ["/", "/matches", "/standings"]) {
      const res = await middleware(makeRequest(path));
      expect(res.headers.get("Content-Security-Policy")).toBeTruthy();
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    }
  });
});
