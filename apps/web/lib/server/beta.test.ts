import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createInvite,
  hasBetaAccess,
  hashInviteToken,
  normalizeInviteCode,
  redeemInvite,
} from "./beta";
import { type Database } from "./db/client";
import { betaInvites } from "./db/schema";
import { createTestDatabase, resetTestDatabase } from "./db/testing";
import { seedUser } from "./test-support/seed";

let db: Database;

beforeAll(async () => {
  db = await createTestDatabase();
});

beforeEach(async () => {
  await resetTestDatabase(db);
});

describe("normalizeInviteCode", () => {
  it("upper-cases and trims", () => {
    expect(normalizeInviteCode("  beta-abc ")).toBe("BETA-ABC");
  });
});

describe("redeemInvite", () => {
  it("grants access on a valid code and signing-in alone does not", async () => {
    const user = await seedUser(db, "a@example.com");
    await createInvite(db, "BETA-1");

    // Before redemption, an authenticated user has no beta access.
    expect(await hasBetaAccess(db, user)).toBe(false);

    const result = await redeemInvite(db, user, "beta-1");
    expect(result.ok).toBe(true);
    expect(await hasBetaAccess(db, user)).toBe(true);
  });

  it("rejects an unknown code", async () => {
    const user = await seedUser(db, "a@example.com");
    const result = await redeemInvite(db, user, "NOPE");
    expect(result).toEqual({ ok: false, reason: "invalid-code" });
  });

  it("is single-use: a second user cannot redeem the same code", async () => {
    const first = await seedUser(db, "first@example.com");
    const second = await seedUser(db, "second@example.com");
    await createInvite(db, "BETA-1");

    expect((await redeemInvite(db, first, "BETA-1")).ok).toBe(true);
    expect(await redeemInvite(db, second, "BETA-1")).toEqual({
      ok: false,
      reason: "already-redeemed",
    });
    expect(await hasBetaAccess(db, second)).toBe(false);
  });

  it("does not grant a second access record to a user who already has one", async () => {
    const user = await seedUser(db, "a@example.com");
    await createInvite(db, "BETA-1");
    await createInvite(db, "BETA-2");
    await redeemInvite(db, user, "BETA-1");

    const second = await redeemInvite(db, user, "BETA-2");
    expect(second).toEqual({ ok: false, reason: "already-has-access" });
  });

  it("rejects an expired invitation", async () => {
    const user = await seedUser(db, "a@example.com");
    await createInvite(db, "BETA-EXP", { expiresAt: new Date("2020-01-01T00:00:00.000Z") });

    const result = await redeemInvite(db, user, "BETA-EXP", {
      now: new Date("2026-07-21T00:00:00.000Z"),
    });
    expect(result).toEqual({ ok: false, reason: "expired" });
    expect(await hasBetaAccess(db, user)).toBe(false);
  });

  it("honours a still-valid expiry", async () => {
    const user = await seedUser(db, "a@example.com");
    await createInvite(db, "BETA-OK", { expiresAt: new Date("2999-01-01T00:00:00.000Z") });
    expect((await redeemInvite(db, user, "BETA-OK")).ok).toBe(true);
  });

  it("restricts redemption to the invited email", async () => {
    const wrong = await seedUser(db, "intruder@example.com");
    await createInvite(db, "BETA-EMAIL", { email: "Owner@Example.com" });

    // Wrong or missing email is rejected.
    expect(
      await redeemInvite(db, wrong, "BETA-EMAIL", { userEmail: "intruder@example.com" }),
    ).toEqual({
      ok: false,
      reason: "email-mismatch",
    });
    expect(await redeemInvite(db, wrong, "BETA-EMAIL")).toEqual({
      ok: false,
      reason: "email-mismatch",
    });

    // Matching email (case-insensitively) is accepted.
    const owner = await seedUser(db, "owner@example.com");
    expect(
      (await redeemInvite(db, owner, "BETA-EMAIL", { userEmail: "owner@example.com" })).ok,
    ).toBe(true);
  });
});

describe("createInvite", () => {
  it("stores only the token hash, never the raw token", async () => {
    await createInvite(db, "SECRET-TOKEN-123", { email: "a@example.com", note: "partner" });
    const rows = await db.select().from(betaInvites);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    if (row === undefined) throw new Error("expected an invite row");
    expect(row.tokenHash).toBe(hashInviteToken("secret-token-123"));
    expect(row.tokenHash).not.toBe("SECRET-TOKEN-123");
    // The raw token appears in no column of the stored row.
    expect(JSON.stringify(row)).not.toMatch(/SECRET-TOKEN-123/i);
    expect(row.email).toBe("a@example.com");
  });
});
