import { describe, it, expect, vi } from "vitest";

// Importing `options.ts` pulls in `@/lib/db`, which constructs a real Prisma
// client at module load. Neutralize that import-time side effect with a stub
// (mirrors `src/lib/cms/audit.test.ts`); the cookie configuration under test
// does not touch the database.
vi.mock("@/lib/db", () => ({
  prisma: {},
  default: {},
}));

import { authOptions } from "./options";

// Unit tests for the NextAuth secure cookie attributes.
//
// _Validates: Requirements 19.2_
//
// In the test environment NODE_ENV is not "production", so the `Secure` flag and
// the `__Secure-`/`__Host-` name prefixes are disabled by design — `Secure`
// tracks production. We assert the deployment-independent guarantees here:
// `httpOnly` on the session/CSRF cookies and `SameSite=Lax` on all auth cookies.

describe("authOptions secure cookie attributes (Req 19.2)", () => {
  it("marks the session-token cookie httpOnly with SameSite=Lax", () => {
    const sessionToken = authOptions.cookies?.sessionToken;
    expect(sessionToken?.options.httpOnly).toBe(true);
    expect(sessionToken?.options.sameSite).toBe("lax");
    expect(sessionToken?.options.path).toBe("/");
  });

  it("marks the csrf-token cookie httpOnly with SameSite=Lax", () => {
    const csrfToken = authOptions.cookies?.csrfToken;
    expect(csrfToken?.options.httpOnly).toBe(true);
    expect(csrfToken?.options.sameSite).toBe("lax");
    expect(csrfToken?.options.path).toBe("/");
  });

  it("sets SameSite=Lax on the callback-url cookie", () => {
    const callbackUrl = authOptions.cookies?.callbackUrl;
    expect(callbackUrl?.options.sameSite).toBe("lax");
    expect(callbackUrl?.options.path).toBe("/");
  });

  it("ties the cookie Secure flag to production (false in non-production tests)", () => {
    // `Secure` is environment-dependent: true only when NODE_ENV=production.
    // The test runner is not production, so the flag must be false here.
    const isProduction = process.env.NODE_ENV === "production";
    expect(authOptions.cookies?.sessionToken?.options.secure).toBe(isProduction);
    expect(authOptions.cookies?.csrfToken?.options.secure).toBe(isProduction);
    expect(authOptions.useSecureCookies).toBe(isProduction);
  });

  it("uses non-prefixed cookie names outside production", () => {
    // The `__Secure-`/`__Host-` prefixes are only applied in production.
    if (process.env.NODE_ENV !== "production") {
      expect(authOptions.cookies?.sessionToken?.name).toBe(
        "next-auth.session-token",
      );
      expect(authOptions.cookies?.csrfToken?.name).toBe(
        "next-auth.csrf-token",
      );
    }
  });
});
