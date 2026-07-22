import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { consumeGeneration, GENERATION_QUOTA, getQuotaStatus } from "./generation-quota";
import { type Database } from "./db/client";
import { createTestDatabase, resetTestDatabase } from "./db/testing";
import { seedUser } from "./test-support/seed";

let db: Database;
let user: string;

beforeAll(async () => {
  db = await createTestDatabase();
});

beforeEach(async () => {
  await resetTestDatabase(db);
  user = await seedUser(db, "a@example.com");
});

const T0 = new Date("2026-07-20T12:00:00.000Z");
const later = (ms: number) => new Date(T0.getTime() + ms);

describe("generation quota", () => {
  it("starts with the full daily allowance", async () => {
    const status = await getQuotaStatus(db, user, T0);
    expect(status).toMatchObject({ used: 0, limit: GENERATION_QUOTA.perDay });
  });

  it("consumes one generation and decrements remaining", async () => {
    const outcome = await consumeGeneration(db, user, T0);
    expect(outcome.allowed).toBe(true);
    if (outcome.allowed) {
      expect(outcome.status.used).toBe(1);
      expect(outcome.status.remaining).toBe(GENERATION_QUOTA.perDay - 1);
    }
  });

  it("rate-limits requests that arrive too quickly", async () => {
    await consumeGeneration(db, user, T0);
    const second = await consumeGeneration(db, user, later(500));
    expect(second.allowed).toBe(false);
    if (!second.allowed) {
      expect(second.reason).toBe("rate-limited");
      expect(second.retryAfterMs).toBeGreaterThan(0);
    }
  });

  it("allows a second request once the interval has passed", async () => {
    await consumeGeneration(db, user, T0);
    const second = await consumeGeneration(db, user, later(GENERATION_QUOTA.minIntervalMs + 1));
    expect(second.allowed).toBe(true);
  });

  it("blocks once the daily quota is exhausted", async () => {
    // Space requests past the rate limit to isolate the daily cap.
    for (let i = 0; i < GENERATION_QUOTA.perDay; i += 1) {
      const outcome = await consumeGeneration(db, user, later(i * GENERATION_QUOTA.minIntervalMs));
      expect(outcome.allowed).toBe(true);
    }
    const overflow = await consumeGeneration(
      db,
      user,
      later(GENERATION_QUOTA.perDay * GENERATION_QUOTA.minIntervalMs),
    );
    expect(overflow.allowed).toBe(false);
    if (!overflow.allowed) expect(overflow.reason).toBe("quota-exceeded");
  });

  it("scopes usage per user", async () => {
    const other = await seedUser(db, "b@example.com");
    await consumeGeneration(db, user, T0);
    // The other user is unaffected by the first user's usage.
    expect((await getQuotaStatus(db, other, T0)).used).toBe(0);
  });

  it("rolls over on a new UTC day", async () => {
    await consumeGeneration(db, user, T0);
    const nextDay = new Date("2026-07-21T00:00:00.000Z");
    expect((await getQuotaStatus(db, user, nextDay)).used).toBe(0);
  });
});
