import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { resolveSignInRole, ROLE_ORDER, roleRank, type Role } from "./roles";

// Feature: worldcup-2026-platform, Property 7: For any existing role on sign-in, the resolved role is the existing role when higher than USER, and USER otherwise; never lowers an elevated role.
describe("resolveSignInRole (Property 7: default role assignment never downgrades)", () => {
  it("returns the existing role when it ranks above USER, USER otherwise, and never downgrades an elevated role", () => {
    // Generator over the full input space: every role, plus the null/undefined
    // sign-in cases that must default to USER.
    const existingRoleArb: fc.Arbitrary<Role | null | undefined> = fc.oneof(
      fc.constantFrom<Role>(...ROLE_ORDER),
      fc.constant(null),
      fc.constant(undefined),
    );

    fc.assert(
      fc.property(existingRoleArb, (existingRole) => {
        const resolved = resolveSignInRole(existingRole);
        const userRank = roleRank("USER");

        if (existingRole != null && roleRank(existingRole) > userRank) {
          // Elevated role: must be preserved exactly, never lowered.
          expect(resolved).toBe(existingRole);
          expect(roleRank(resolved)).toBe(roleRank(existingRole));
        } else {
          // null, undefined, or USER: must default to USER.
          expect(resolved).toBe("USER");
        }

        // Never downgrades an already-elevated role: the resolved rank is at
        // least the existing rank whenever the existing role is elevated.
        if (existingRole != null && roleRank(existingRole) > userRank) {
          expect(roleRank(resolved)).toBeGreaterThanOrEqual(
            roleRank(existingRole),
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Validates: Requirements 5.5
 */
