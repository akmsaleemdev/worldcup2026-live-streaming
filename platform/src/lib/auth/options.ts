/**
 * Shared NextAuth configuration (`authOptions`).
 *
 * Implements:
 * - Req 5.1 — authenticate users with email (Credentials) and Google sign-in.
 * - Req 5.4 — issue authenticated sessions using JWT (`session.strategy = "jwt"`).
 * - Req 5.5 — assign the default role of USER on sign-in unless a higher role is
 *   already assigned, via the pure `resolveSignInRole` resolver (never downgrade).
 * - Req 19.2 — set secure attributes on authentication cookies (`httpOnly`,
 *   `SameSite=Lax`, and `Secure` in production with the `__Secure-`/`__Host-`
 *   cookie-name prefixes).
 *
 * Design references: design.md "Authentication & RBAC (Req 5, 19)".
 *
 * This module is consumed by:
 * - `app/api/auth/[...nextauth]/route.ts` (the NextAuth handler), and
 * - server components / actions that call `getServerSession(authOptions)`.
 *
 * The Edge `middleware.ts` intentionally does NOT import this file (it pulls in
 * the Prisma client and `node:crypto`, which are unavailable on the Edge
 * runtime). Instead it decodes the same signed cookie with `getToken`, using
 * `secureCookie: isProduction` so it reads the matching cookie name defined in
 * the `cookies` block below.
 */
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { resolveSignInRole, type Role } from "@/lib/auth/roles";
import { prisma } from "@/lib/db";

/** True when running in a production deployment (controls cookie security). */
const isProduction = process.env.NODE_ENV === "production";

/**
 * Verify a Credentials-provider password for an existing user.
 *
 * SECURITY (documented limitation): the current `User` Prisma model has no
 * stored password/credential hash column, so there is no secret to verify
 * against yet. Until a `passwordHash` field is added to the schema, credential
 * password sign-in cannot be validated and is therefore denied by default —
 * we never grant access without verifying a secret. The functional first-party
 * sign-in path in this configuration is Google OAuth.
 *
 * When a `passwordHash` field is added, replace the body with a constant-time
 * hash comparison, e.g.:
 *   `return verify(password, user.passwordHash)` using a vetted KDF
 *   (bcrypt/argon2/scrypt). The call site in `authorize` does not change.
 */
async function verifyCredentialPassword(
  user: { id: string },
  password: string,
): Promise<boolean> {
  // No stored credential hash exists on the current schema, so there is nothing
  // to compare against. Reference the args to keep the documented signature
  // stable for the future hash-comparison implementation.
  void user;
  void password;
  return false;
}

export const authOptions: NextAuthOptions = {
  // Prisma adapter persists users/accounts/sessions via the singleton client
  // (Req 5.1). With the JWT strategy the adapter is still used for OAuth
  // account linking and user records.
  adapter: PrismaAdapter(prisma),

  // JWT-based sessions (Req 5.4).
  session: {
    strategy: "jwt",
  },

  // Signing/encryption secret for the session JWT. Must match the secret used
  // by `getToken` in middleware.
  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    // Email + password sign-in (Req 5.1). See `verifyCredentialPassword` for
    // the documented verification limitation.
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          return null;
        }

        const ok = await verifyCredentialPassword(user, password);
        if (!ok) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),

    // Google OAuth sign-in (Req 5.1). Credentials are read from the
    // environment; empty fallbacks keep the type signature satisfied when the
    // env is not yet configured (the provider simply fails to authenticate).
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: false,
    }),
  ],

  callbacks: {
    /**
     * Attach the platform role to the JWT (Req 5.5). On initial sign-in the
     * `user` argument is present; the role is resolved with `resolveSignInRole`
     * so an already-elevated role is preserved and everything else defaults to
     * USER. On subsequent calls the role already on the token is retained.
     */
    async jwt({ token, user }) {
      if (user) {
        const existingRole = (user as { role?: Role | null }).role ?? null;
        token.role = resolveSignInRole(existingRole);
      } else if (!token.role) {
        token.role = "USER";
      }
      return token;
    },

    /**
     * Expose the user id and role on the session object so server components,
     * actions, and UI gating can read them (Req 5.5).
     */
    async session({ session, token }) {
      if (session.user) {
        if (token.sub) {
          session.user.id = token.sub;
        }
        session.user.role = (token.role as Role | undefined) ?? "USER";
      }
      return session;
    },
  },

  // Secure cookie attributes (Req 19.2). In production cookies are `Secure` and
  // use the `__Secure-`/`__Host-` name prefixes; all session/CSRF cookies are
  // `httpOnly` with `SameSite=Lax`. The session-token cookie name here matches
  // what `getToken({ secureCookie: isProduction })` expects in middleware.
  useSecureCookies: isProduction,
  cookies: {
    sessionToken: {
      name: isProduction
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
    callbackUrl: {
      name: isProduction
        ? "__Secure-next-auth.callback-url"
        : "next-auth.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
    csrfToken: {
      name: isProduction
        ? "__Host-next-auth.csrf-token"
        : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
  },
};

export default authOptions;
