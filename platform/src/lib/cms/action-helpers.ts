/**
 * Shared server-action helpers for the CMS (Req 6.3, 6.4, 6.5).
 *
 * Every mutating CMS Server Action follows the same three-step contract:
 *   1. Re-check permission server-side via `@/lib/rbac` (defense in depth,
 *      Req 6.4) — middleware already gates `/admin/*`, but actions never trust
 *      that alone.
 *   2. Validate inputs, then perform the Prisma write (Req 6.3).
 *   3. Record exactly one audit-log entry via `@/lib/cms/audit` (Req 6.5).
 *
 * This module centralizes the cross-cutting concerns shared by the
 * stream/match/tournament actions: the typed error classes, the
 * session + permission gate (`authorizeAction`), and a handful of pure
 * input-validation primitives. Keeping these here keeps each action file
 * focused on its entity's write logic.
 */
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/options";
import { can, type Permission, type Role } from "@/lib/rbac";

/**
 * Thrown when there is no authenticated session backing a mutating action.
 * Distinct from {@link ForbiddenError} so callers/UI can tell "sign in" from
 * "not allowed".
 */
export class UnauthorizedError extends Error {
  /** Stable, serializable discriminator for clients. */
  readonly code = "UNAUTHORIZED" as const;

  constructor(message = "Authentication is required to perform this action.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Thrown when an authenticated actor lacks the permission required by an
 * action (Req 6.4). Carries the offending role and the permission that was
 * required so the failure is self-describing in logs.
 */
export class ForbiddenError extends Error {
  /** Stable, serializable discriminator for clients. */
  readonly code = "FORBIDDEN" as const;

  constructor(
    readonly role: Role,
    readonly permission: Permission,
  ) {
    super(`Role "${role}" lacks required permission "${permission}".`);
    this.name = "ForbiddenError";
  }
}

/**
 * Thrown when server-side input validation fails before any write occurs. The
 * `field` identifies the offending input where known.
 */
export class ValidationError extends Error {
  /** Stable, serializable discriminator for clients. */
  readonly code = "VALIDATION" as const;

  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/** An actor that has been authenticated and authorized for an action. */
export interface AuthorizedActor {
  /** The acting user's database id (used as the audit `actorId`). */
  id: string;
  /** The acting user's resolved platform role. */
  role: Role;
}

/**
 * Resolve the current session and assert it holds `permission`.
 *
 * This is the single entry point every mutating CMS action uses to enforce
 * RBAC server-side (Req 6.4). Throws {@link UnauthorizedError} when there is no
 * session and {@link ForbiddenError} when the session's role lacks
 * `permission`. On success it returns the authorized actor, whose `id` is then
 * passed to `recordAudit` as the `actorId` (Req 6.5).
 */
export async function authorizeAction(
  permission: Permission,
): Promise<AuthorizedActor> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  const role = session.user.role;
  if (!can(role, permission)) {
    throw new ForbiddenError(role, permission);
  }

  return { id: session.user.id, role };
}

// ---------------------------------------------------------------------------
// Pure input-validation primitives
// ---------------------------------------------------------------------------

/**
 * Assert a value is a non-empty (after trim) string and return the trimmed
 * value. Throws {@link ValidationError} otherwise.
 */
export function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`"${field}" is required.`, field);
  }
  return value.trim();
}

/**
 * Return a trimmed string for a present, non-empty value, or `null` when the
 * value is absent (`undefined`/`null`/empty). Throws when a present value is
 * not a string.
 */
export function optionalString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new ValidationError(`"${field}" must be a string.`, field);
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Assert a value is one of `allowed` and return it narrowed to that union.
 */
export function requireEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ValidationError(
      `"${field}" must be one of: ${allowed.join(", ")}.`,
      field,
    );
  }
  return value as T;
}

/**
 * Coerce a value to a boolean. Accepts real booleans and the strings
 * "true"/"false"/"on" (the latter as produced by HTML checkboxes). Falls back
 * to `fallback` when the value is absent.
 */
export function coerceBoolean(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true" || value === "on" || value === "1") {
    return true;
  }
  if (value === "false" || value === "0") {
    return false;
  }
  return Boolean(value);
}

/**
 * Parse a finite integer from a number or numeric string. Returns `fallback`
 * when the value is absent. Throws when a present value is non-numeric.
 */
export function requireInt(value: unknown, field: string, fallback = 0): number {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed)) {
    throw new ValidationError(`"${field}" must be an integer.`, field);
  }
  return parsed;
}

/**
 * Parse an optional integer. Returns `null` when absent; throws when a present
 * value is non-numeric. Useful for nullable score columns.
 */
export function optionalInt(value: unknown, field: string): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed)) {
    throw new ValidationError(`"${field}" must be an integer.`, field);
  }
  return parsed;
}

/**
 * Parse a required Date from a `Date`, ISO string, or epoch number. Throws
 * {@link ValidationError} on an invalid/absent value.
 */
export function requireDate(value: unknown, field: string): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  throw new ValidationError(`"${field}" must be a valid date.`, field);
}
