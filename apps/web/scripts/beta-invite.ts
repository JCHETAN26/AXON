/**
 * Operator tool for private-beta invitations.
 *
 *   pnpm beta:invite --email you@example.com [--expires-in 7d] [--note "..."]
 *   pnpm beta:invite --revoke <RAW-TOKEN>
 *
 * Creation generates a high-entropy token, stores ONLY its SHA-256 hash, and
 * prints the raw token to stdout exactly once — it cannot be recovered later.
 * The invitation is single-use, restricted to the given email, and expires
 * (default 7 days). The raw token and the hash are never written to logs.
 *
 * It connects to whatever DATABASE_URL points at (the pooled Supabase URL for
 * the beta) and refuses to run against the in-process test driver.
 */
import { randomBytes } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";

import { createInvite, hashInviteToken } from "../lib/server/beta";
import { getDatabaseAsync } from "../lib/server/db/client";
import { betaInvites } from "../lib/server/db/schema";

// Crockford base32 (no I, L, O, U) — unambiguous when read or typed.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function generateToken(): string {
  const bytes = randomBytes(15); // 120 bits of entropy
  let out = "";
  for (const b of bytes) out += ALPHABET[b % 32];
  return `AXON-${out.slice(0, 5)}-${out.slice(5, 10)}-${out.slice(10, 15)}-${out.slice(15, 20)}`;
}

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function parseExpiry(spec: string | undefined): Date {
  const days = spec === undefined ? 7 : Number(spec.replace(/d$/i, ""));
  if (!Number.isInteger(days) || days <= 0 || days > 365) {
    throw new Error(`Invalid --expires-in "${spec}". Use e.g. 7d (1–365 days).`);
  }
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url.trim() === "") {
    console.error("Refusing to run: DATABASE_URL is not set.");
    process.exit(1);
  }
  if (process.env.AXON_DB_DRIVER === "pglite") {
    console.error("Refusing to run against the in-process test driver (AXON_DB_DRIVER=pglite).");
    process.exit(1);
  }

  const db = await getDatabaseAsync();

  const revokeToken = arg("--revoke");
  if (revokeToken !== undefined) {
    const removed = await db
      .delete(betaInvites)
      .where(
        and(
          eq(betaInvites.tokenHash, hashInviteToken(revokeToken)),
          isNull(betaInvites.redeemedByUserId),
        ),
      )
      .returning({ id: betaInvites.id });
    if (removed.length > 0) {
      console.info("Revoked 1 unredeemed invitation.");
    } else {
      console.info("No unredeemed invitation matched that token (already redeemed or unknown).");
    }
    return;
  }

  const email = arg("--email");
  if (email === undefined || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Usage: pnpm beta:invite --email <address> [--expires-in 7d] [--note "..."]');
    process.exit(1);
  }
  const expiresAt = parseExpiry(arg("--expires-in"));
  const note = arg("--note");

  const token = generateToken();
  await createInvite(db, token, { email, expiresAt, ...(note !== undefined && { note }) });

  // The raw token is printed exactly once. Anything else here is non-secret.
  console.info("");
  console.info("  Invitation created (single-use, hash stored — raw token shown once):");
  console.info("");
  console.info(`    TOKEN:   ${token}`);
  console.info(`    email:   ${email}`);
  console.info(`    expires: ${expiresAt.toISOString()}`);
  console.info("");
  console.info("  Share the token over a secure channel. It cannot be recovered.");
  console.info("");
}

void main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : "Failed to run beta-invite.");
    process.exit(1);
  },
);
