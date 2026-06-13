import { describe, it } from "vitest";
import { fc } from "../test/fc";
import {
  ALL_MODULES,
  ALL_PERMISSIONS,
  can,
  permittedModules,
  type ModuleId,
  type Permission,
  type Role,
} from "./rbac";

// Feature: worldcup-2026-platform, Property 6: For any role and permission, can(role, permission) returns true iff the pair exists in the permission table, and permittedModules(role) lists exactly the modules whose required permission the role holds.
//
// _Validates: Requirements 5.3, 5.6, 6.4_
//
// The test re-derives the expected permission table and module->permission map
// independently from rbac.ts (the design.md §5 source of truth), so the test is
// an oracle rather than a tautology over the module's own internal tables.

const ALL_ROLES: readonly Role[] = [
  "USER",
  "MODERATOR",
  "ANALYST",
  "EDITOR",
  "ADMIN",
  "SUPER_ADMIN",
];

// Independent re-derivation of the expected role -> permissions oracle.
const EXPECTED_PERMISSIONS: Readonly<Record<Role, ReadonlySet<Permission>>> = {
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

// Independent re-derivation of the module -> required permission oracle.
const EXPECTED_MODULE_PERMISSION: Readonly<Record<ModuleId, Permission>> = {
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

describe("rbac resolution (Property 6)", () => {
  it("can() matches the permission table and permittedModules() lists exactly permitted modules", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_ROLES),
        fc.constantFrom(...ALL_PERMISSIONS),
        (role, perm) => {
          // can(role, perm) is true iff the (role, perm) pair is in the table.
          const expectedCan = EXPECTED_PERMISSIONS[role].has(perm);
          if (can(role, perm) !== expectedCan) {
            return false;
          }

          // permittedModules(role) lists exactly the modules whose required
          // permission the role holds, in ALL_MODULES navigation order.
          const expectedModules = ALL_MODULES.filter((moduleId) =>
            EXPECTED_PERMISSIONS[role].has(EXPECTED_MODULE_PERMISSION[moduleId]),
          );
          const actualModules = permittedModules(role);

          if (actualModules.length !== expectedModules.length) {
            return false;
          }
          return actualModules.every((m, i) => m === expectedModules[i]);
        },
      ),
      { numRuns: 100 },
    );
  });
});
