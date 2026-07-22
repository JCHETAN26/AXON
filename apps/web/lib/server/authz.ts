import { hasBetaAccess } from "./beta";
import { type Database } from "./db/client";

/** A verified, server-side identity. Never trust a client-supplied id instead. */
export interface AuthenticatedUser {
  readonly id: string;
  readonly email?: string;
}

export type AccessDenial = "unauthenticated" | "no-beta-access";

export type AccessResult =
  { ok: true; user: AuthenticatedUser } | { ok: false; reason: AccessDenial };

/**
 * Gates a product operation. The user identity must come from a validated
 * server-side session (never from the request body or a query parameter), and
 * beta access must have been granted by redeeming an invite — signing in is
 * not sufficient.
 */
export async function authorizeBetaUser(
  db: Database,
  user: AuthenticatedUser | null,
): Promise<AccessResult> {
  if (user === null) {
    return { ok: false, reason: "unauthenticated" };
  }
  if (!(await hasBetaAccess(db, user.id))) {
    return { ok: false, reason: "no-beta-access" };
  }
  return { ok: true, user };
}
