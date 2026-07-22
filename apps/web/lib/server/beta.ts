import { and, eq, isNull } from "drizzle-orm";

import { type Database } from "./db/client";
import { betaAccess, betaInvites } from "./db/schema";

/** Normalises invite codes so entry is case- and whitespace-insensitive. */
export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function hasBetaAccess(db: Database, userId: string): Promise<boolean> {
  const rows = await db.select().from(betaAccess).where(eq(betaAccess.userId, userId)).limit(1);
  return rows.length > 0;
}

export type RedeemResult =
  { ok: true } | { ok: false; reason: "already-has-access" | "invalid-code" | "already-redeemed" };

/**
 * Redeems a single-use invite for a user. Signing in never grants access on
 * its own — access exists only after a successful redemption here. The update
 * is guarded so a code cannot be redeemed twice, even under a race.
 */
export async function redeemInvite(
  db: Database,
  userId: string,
  rawCode: string,
  now: Date = new Date(),
): Promise<RedeemResult> {
  if (await hasBetaAccess(db, userId)) {
    return { ok: false, reason: "already-has-access" };
  }

  const code = normalizeInviteCode(rawCode);
  const invites = await db.select().from(betaInvites).where(eq(betaInvites.code, code)).limit(1);
  const invite = invites[0];
  if (invite === undefined) {
    return { ok: false, reason: "invalid-code" };
  }

  // Claim the invite only if it is still unredeemed. The WHERE on
  // redeemed_by_user_id IS NULL makes this atomic — a second caller updates
  // zero rows.
  const claimed = await db
    .update(betaInvites)
    .set({ redeemedByUserId: userId, redeemedAt: now })
    .where(and(eq(betaInvites.id, invite.id), isNull(betaInvites.redeemedByUserId)))
    .returning({ id: betaInvites.id });

  if (claimed.length === 0) {
    return { ok: false, reason: "already-redeemed" };
  }

  await db
    .insert(betaAccess)
    .values({ userId, inviteId: invite.id, grantedAt: now })
    .onConflictDoNothing();

  return { ok: true };
}

/** Creates an invite code (admin/seed helper). */
export async function createInvite(
  db: Database,
  code: string,
  note?: string,
): Promise<{ id: string; code: string }> {
  const normalized = normalizeInviteCode(code);
  const rows = await db
    .insert(betaInvites)
    .values({ code: normalized, ...(note !== undefined && { note }) })
    .returning({ id: betaInvites.id, code: betaInvites.code });
  const created = rows[0];
  if (created === undefined) {
    throw new Error("Failed to create invite.");
  }
  return created;
}
