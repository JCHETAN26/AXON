import { eq, sql } from "drizzle-orm";

import { type Database } from "./db/client";
import { betaInvites, users } from "./db/schema";
import { ACCOUNT_DELETE_CONFIRMATION } from "@/lib/account-constants";

export { ACCOUNT_DELETE_CONFIRMATION };

export interface DeleteAccountResult {
  readonly ok: boolean;
}

/**
 * Permanently deletes the authenticated user's account and all owner-scoped
 * product data, in a single transaction.
 *
 * Identity comes only from the caller-supplied session-derived `userId` — never
 * from client input. Deleting the `users` row cascades to accounts, sessions,
 * beta access, projects → documents → artifacts, generation usage, and
 * feedback (all `onDelete: cascade`). Redeemed invitations are retained with
 * their redemption cleared (`redeemedByUserId` → null) for abuse prevention;
 * they carry no architecture content.
 *
 * The whole operation is atomic: any error rolls the transaction back and this
 * returns `{ ok: false }`, so a failed deletion never reports success and the
 * account and its projects remain intact.
 */
export async function deleteAccount(db: Database, userId: string): Promise<DeleteAccountResult> {
  try {
    await db.transaction(async (tx) => {
      // Retain the invite row (abuse prevention) but detach it from the user.
      await tx
        .update(betaInvites)
        .set({ redeemedByUserId: null })
        .where(eq(betaInvites.redeemedByUserId, userId));

      // Cascades remove all owner-scoped product and auth data atomically.
      const deleted = await tx
        .delete(users)
        .where(eq(users.id, userId))
        .returning({ id: users.id });
      if (deleted.length === 0) {
        // Nothing deleted (already gone / not found) — roll back and report
        // failure rather than a misleading success.
        throw new Error("account-not-found");
      }
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Confirms an account still exists — used by tests to assert non-destruction. */
export async function accountExists(db: Database, userId: string): Promise<boolean> {
  const rows = await db
    .select({ one: sql`1` })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows.length > 0;
}
