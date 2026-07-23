/**
 * Signed, short-lived, single-use state for the GitHub App installation
 * redirect. The state token is `<rowId>.<hmac(rowId)>`; the row in
 * `github_install_states` enforces single use (atomic consume), expiry, and the
 * binding to the authenticated user who started the flow. A replayed or tampered
 * callback fails safely (returns null).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import { type Database } from "../db/client";
import { githubInstallStates } from "../db/schema";

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sign(id: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "").update(id).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Creates a single-use state row and returns the signed state token. */
export async function createInstallState(
  db: Database,
  userId: string,
  now: Date = new Date(),
): Promise<string> {
  const rows = await db
    .insert(githubInstallStates)
    .values({ userId, expiresAt: new Date(now.getTime() + STATE_TTL_MS) })
    .returning({ id: githubInstallStates.id });
  const id = rows[0]?.id;
  if (id === undefined) throw new Error("Failed to create install state.");
  return `${id}.${sign(id)}`;
}

/**
 * Verifies the signature and atomically consumes the state, returning the bound
 * user id. Returns null for a tampered, unknown, expired, or already-consumed
 * token — so replay and forgery fail safely.
 */
export async function consumeInstallState(
  db: Database,
  token: string | null | undefined,
  now: Date = new Date(),
): Promise<{ userId: string } | null> {
  if (typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const id = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!UUID_RE.test(id) || !safeEqual(sig, sign(id))) return null;

  const claimed = await db
    .update(githubInstallStates)
    .set({ consumedAt: now })
    .where(
      and(
        eq(githubInstallStates.id, id),
        isNull(githubInstallStates.consumedAt),
        gt(githubInstallStates.expiresAt, now),
      ),
    )
    .returning({ userId: githubInstallStates.userId });
  const row = claimed[0];
  return row ? { userId: row.userId } : null;
}
