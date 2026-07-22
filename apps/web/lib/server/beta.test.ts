import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createInvite, hasBetaAccess, normalizeInviteCode, redeemInvite } from "./beta";
import { type Database } from "./db/client";
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
});
