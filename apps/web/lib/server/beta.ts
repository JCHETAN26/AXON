import { createHash } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";

import { type Database } from "./db/client";
import { betaAccess, betaInvites } from "./db/schema";

/** Normalises invite tokens so entry is case- and whitespace-insensitive. */
export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Normalises an email for storage and comparison (lower-cased, trimmed). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * The at-rest identifier for an invitation. Only this hash is stored — the raw
 * token is shown to the operator once at creation and is never persisted, so a
 * database read can never reveal a redeemable token.
 */
export function hashInviteToken(rawCode: string): string {
  return createHash("sha256").update(normalizeInviteCode(rawCode)).digest("hex");
}

export async function hasBetaAccess(db: Database, userId: string): Promise<boolean> {
  const rows = await db.select().from(betaAccess).where(eq(betaAccess.userId, userId)).limit(1);
  return rows.length > 0;
}

export type RedeemReason =
  "already-has-access" | "invalid-code" | "already-redeemed" | "expired" | "email-mismatch";

export type RedeemResult = { ok: true } | { ok: false; reason: RedeemReason };

/**
 * Redeems a single-use invite for a user. Signing in never grants access on its
 * own — access exists only after a successful redemption here. Redemption
 * enforces (in order) validity, expiry, email restriction, and single use; the
 * claiming update is guarded so a token cannot be redeemed twice, even under a
 * race.
 */
export async function redeemInvite(
  db: Database,
  userId: string,
  rawCode: string,
  opts: { userEmail?: string; now?: Date } = {},
): Promise<RedeemResult> {
  const now = opts.now ?? new Date();

  if (await hasBetaAccess(db, userId)) {
    return { ok: false, reason: "already-has-access" };
  }

  const tokenHash = hashInviteToken(rawCode);
  const invites = await db
    .select()
    .from(betaInvites)
    .where(eq(betaInvites.tokenHash, tokenHash))
    .limit(1);
  const invite = invites[0];
  if (invite === undefined) {
    return { ok: false, reason: "invalid-code" };
  }

  if (invite.expiresAt !== null && now.getTime() > invite.expiresAt.getTime()) {
    return { ok: false, reason: "expired" };
  }

  if (invite.email !== null) {
    const sessionEmail = opts.userEmail === undefined ? "" : normalizeEmail(opts.userEmail);
    if (sessionEmail !== invite.email) {
      return { ok: false, reason: "email-mismatch" };
    }
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

/**
 * Creates an invitation, storing only the token hash. Returns the raw token so
 * the caller can present it once. An optional email restriction and expiry make
 * the invitation single-recipient and time-bounded.
 */
export async function createInvite(
  db: Database,
  rawCode: string,
  opts: { email?: string; expiresAt?: Date; note?: string } = {},
): Promise<{ id: string; code: string }> {
  const rows = await db
    .insert(betaInvites)
    .values({
      tokenHash: hashInviteToken(rawCode),
      ...(opts.email !== undefined && { email: normalizeEmail(opts.email) }),
      ...(opts.expiresAt !== undefined && { expiresAt: opts.expiresAt }),
      ...(opts.note !== undefined && { note: opts.note }),
    })
    .returning({ id: betaInvites.id });
  const created = rows[0];
  if (created === undefined) {
    throw new Error("Failed to create invite.");
  }
  return { id: created.id, code: normalizeInviteCode(rawCode) };
}
