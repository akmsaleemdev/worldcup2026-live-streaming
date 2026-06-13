/**
 * NextAuth module augmentation (Req 5.4, 5.5).
 *
 * Extends the default NextAuth types so the custom fields written by the JWT
 * and session callbacks in `@/lib/auth/options` are type-safe across the app:
 * - `session.user.id`   — the user's database id, copied from `token.sub`.
 * - `session.user.role` — the resolved platform role (never a downgrade).
 * - `token.role`        — the role carried in the signed JWT.
 *
 * Without this augmentation the default `Session["user"]` only exposes
 * `name`/`email`/`image` and the default `JWT` has no `role`, so reads/writes
 * of those fields would not type-check.
 */
import type { DefaultSession } from "next-auth";

import type { Role } from "@/lib/auth/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  /**
   * The shape returned by the Credentials provider `authorize` and persisted by
   * the adapter; carries the platform `role`.
   */
  interface User {
    role?: Role | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
  }
}
