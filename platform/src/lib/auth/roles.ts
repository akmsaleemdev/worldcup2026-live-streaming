/**
 * Default role resolution (pure, no IO).
 *
 * Implements Requirement 5.5: on sign-in, a user's role is preserved when it is
 * already elevated above USER, and otherwise defaults to USER. The resolution
 * must never downgrade an already-elevated role.
 *
 * This module is intentionally self-contained: the `Role` union is duplicated
 * here (consistent with `src/lib/rbac.ts`) so it does not depend on the Prisma
 * client or on `rbac.ts` (which is authored in parallel). A later task may
 * reconcile the two definitions into a single shared type.
 */

/**
 * The six platform roles, ordered from least to most privileged.
 * Consistent with the Prisma `Role` enum and `src/lib/rbac.ts`.
 */
export type Role =
  | "USER"
  | "MODERATOR"
  | "ANALYST"
  | "EDITOR"
  | "ADMIN"
  | "SUPER_ADMIN";

/**
 * Role privilege ordering, least to most privileged.
 * USER < MODERATOR < ANALYST < EDITOR < ADMIN < SUPER_ADMIN
 */
export const ROLE_ORDER: readonly Role[] = [
  "USER",
  "MODERATOR",
  "ANALYST",
  "EDITOR",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

/**
 * Numeric rank for a role within {@link ROLE_ORDER}. Higher means more
 * privileged. USER is rank 0. An unknown role is treated as USER (rank 0).
 */
export function roleRank(role: Role): number {
  const rank = ROLE_ORDER.indexOf(role);
  return rank === -1 ? 0 : rank;
}

/**
 * Resolve the role to assign on sign-in.
 *
 * Returns the existing role when it is strictly higher than USER; otherwise
 * returns USER. `null`, `undefined`, an unknown value, or USER all resolve to
 * USER. This never downgrades an already-elevated role.
 */
export function resolveSignInRole(
  existingRole: Role | null | undefined,
): Role {
  if (existingRole == null) {
    return "USER";
  }
  return roleRank(existingRole) > roleRank("USER") ? existingRole : "USER";
}
