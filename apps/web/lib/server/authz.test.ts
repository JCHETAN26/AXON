import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { authorizeBetaUser } from "./authz";
import { createInvite, redeemInvite } from "./beta";
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

describe("authorizeBetaUser", () => {
  it("denies an unauthenticated caller", async () => {
    expect(await authorizeBetaUser(db, null)).toEqual({ ok: false, reason: "unauthenticated" });
  });

  it("denies an authenticated user without beta access", async () => {
    const id = await seedUser(db, "a@example.com");
    expect(await authorizeBetaUser(db, { id })).toEqual({ ok: false, reason: "no-beta-access" });
  });

  it("allows an authenticated user who has redeemed an invite", async () => {
    const id = await seedUser(db, "a@example.com");
    await createInvite(db, "BETA-1");
    await redeemInvite(db, id, "BETA-1");

    const result = await authorizeBetaUser(db, { id });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.id).toBe(id);
  });
});
