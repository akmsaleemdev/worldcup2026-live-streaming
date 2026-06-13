/**
 * RBAC permission resolver (pure, table-driven).
 *
 * This module is the single source of truth for role-based access control. It
 * is intentionally dependency-free: it imports neither `next-auth` nor the
 * Prisma client so it stays pure, deterministic, and trivially testable. The
 * `Role` union is declared locally as a string-literal mirror of the Prisma
 * `Role` enum rather than imported, to keep this module free of runtime/IO
 * dependencies.
 *
 * Design references: design.md "Authentication & RBAC (Req 5, 19)" and
 * "Components §5". Requirements: 5.2, 5.6, 6.4.
 */

/**
 * Discrete permission actions guarding CMS/admin capabilities.
 * Mirrors the `Permission` union defined in design.md §5.
 */
export type Permission =
  | "content:read"
  | "content:write"
  | "content:delete"
  | "stream:manage"
  | "match:manage"
  | "tournament:manage"
  | "ads:manage"
  | "faq:manage"
  | "user:manage"
  | "settings:manage"
  | "analytics:view"
  | "moderate:comments"
  | "admin:access";

/**
 * Application roles. Local string-literal union mirroring the Prisma `Role`
 * enum (USER, MODERATOR, ANALYST, EDITOR, ADMIN, SUPER_ADMIN). Declared here
 * (not imported) to keep this module pure and dependency-free.
 */
export type Role =
  | "USER"
  | "MODERATOR"
  | "ANALYST"
  | "EDITOR"
  | "ADMIN"
  | "SUPER_ADMIN";

/**
 * CMS admin module identifiers used for navigation gating.
 */
export type ModuleId =
  | "dashboard"
  | "content"
  | "streams"
  | "matches"
  | "tournament"
  | "ads"
  | "faq"
  | "users"
  | "settings"
  | "analytics";

/** Every permission action, in declaration order. */
export const ALL_PERMISSIONS: readonly Permission[] = [
  "content:read",
  "content:write",
  "content:delete",
  "stream:manage",
  "match:manage",
  "tournament:manage",
  "ads:manage",
  "faq:manage",
  "user:manage",
  "settings:manage",
  "analytics:view",
  "moderate:comments",
  "admin:access",
];

/** Every CMS module identifier, in navigation order. */
export const ALL_MODULES: readonly ModuleId[] = [
  "dashboard",
  "content",
  "streams",
  "matches",
  "tournament",
  "ads",
  "faq",
  "users",
  "settings",
  "analytics",
];

/**
 * Static permission table mapping each Role to the set of Permissions it holds.
 *
 * Chosen mapping (documented per task 3.1):
 * - SUPER_ADMIN: all permissions (unrestricted).
 * - ADMIN: all permissions EXCEPT `settings:manage`, which is reserved to
 *   SUPER_ADMIN. ADMIN retains `admin:access` plus every other manage/view
 *   permission.
 * - EDITOR: content lifecycle (`content:read`/`content:write`/`content:delete`),
 *   `faq:manage`, and `admin:access`.
 * - MODERATOR: `moderate:comments`, `content:read`, and `admin:access`.
 * - ANALYST: `analytics:view`, `content:read`, and `admin:access`.
 * - USER: no permissions (no admin access).
 */
const PERMISSION_TABLE: Readonly<Record<Role, ReadonlySet<Permission>>> = {
  SUPER_ADMIN: new Set<Permission>(ALL_PERMISSIONS),
  ADMIN: new Set<Permission>(
    ALL_PERMISSIONS.filter((p) => p !== "settings:manage"),
  ),
  EDITOR: new Set<Permission>([
    "content:read",
    "content:write",
    "content:delete",
    "faq:manage",
    "admin:access",
  ]),
  MODERATOR: new Set<Permission>([
    "moderate:comments",
    "content:read",
    "admin:access",
  ]),
  ANALYST: new Set<Permission>([
    "analytics:view",
    "content:read",
    "admin:access",
  ]),
  USER: new Set<Permission>(),
};

/**
 * Maps each CMS module to the single permission required to access it. A role
 * may use a module iff it holds the module's required permission.
 */
const MODULE_REQUIRED_PERMISSION: Readonly<Record<ModuleId, Permission>> = {
  dashboard: "admin:access",
  content: "content:read",
  streams: "stream:manage",
  matches: "match:manage",
  tournament: "tournament:manage",
  ads: "ads:manage",
  faq: "faq:manage",
  users: "user:manage",
  settings: "settings:manage",
  analytics: "analytics:view",
};

/**
 * Returns true iff `role` holds `perm` according to the static permission
 * table. Pure, total, and deterministic.
 */
export function can(role: Role, perm: Permission): boolean {
  return PERMISSION_TABLE[role].has(perm);
}

/**
 * Returns exactly the modules whose required permission `role` holds, in the
 * fixed navigation order defined by `ALL_MODULES`. Pure, total, and
 * deterministic.
 */
export function permittedModules(role: Role): ModuleId[] {
  return ALL_MODULES.filter((moduleId) =>
    can(role, MODULE_REQUIRED_PERMISSION[moduleId]),
  );
}
