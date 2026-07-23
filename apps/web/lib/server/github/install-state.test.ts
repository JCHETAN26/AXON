import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { consumeInstallState, createInstallState } from "./install-state";
import { type Database } from "../db/client";
import { createTestDatabase, resetTestDatabase } from "../db/testing";
import { seedUser } from "../test-support/seed";

let db: Database;

beforeAll(async () => {
  db = await createTestDatabase();
});
beforeEach(async () => {
  await resetTestDatabase(db);
});

describe("install-state", () => {
  it("creates a token that consumes once to the bound user", async () => {
    const user = await seedUser(db, "a@example.com");
    const token = await createInstallState(db, user);
    expect(await consumeInstallState(db, token)).toEqual({ userId: user });
  });

  it("is single-use: a second consume fails", async () => {
    const user = await seedUser(db, "a@example.com");
    const token = await createInstallState(db, user);
    expect(await consumeInstallState(db, token)).toEqual({ userId: user });
    expect(await consumeInstallState(db, token)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const user = await seedUser(db, "a@example.com");
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const token = await createInstallState(db, user, past);
    expect(await consumeInstallState(db, token)).toBeNull();
  });

  it("rejects a tampered signature", async () => {
    const user = await seedUser(db, "a@example.com");
    const token = await createInstallState(db, user);
    const [id] = token.split(".");
    expect(await consumeInstallState(db, `${id}.forged-signature`)).toBeNull();
  });

  it("rejects malformed and unknown tokens", async () => {
    expect(await consumeInstallState(db, undefined)).toBeNull();
    expect(await consumeInstallState(db, "no-dot")).toBeNull();
    expect(await consumeInstallState(db, "not-a-uuid.sig")).toBeNull();
    expect(
      await consumeInstallState(db, "00000000-0000-0000-0000-000000000000.sig"),
    ).toBeNull();
  });
});
