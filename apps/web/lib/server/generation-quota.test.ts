import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { consumeGeneration, generationQuota, getQuotaStatus } from "./generation-quota";
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

// Limits now come from the environment; resolve once against the test env.
const QUOTA = generationQuota();

const T0 = new Date("2026-07-20T12:00:00.000Z");
const later = (ms: number) => new Date(T0.getTime() + ms);

describe("generationQuota limits", () => {
  it("applies the deployment overrides", () => {
    expect(
      generationQuota({
        AXON_GENERATION_DAILY_LIMIT: "5",
        AXON_GENERATION_PER_MINUTE_LIMIT: "4",
      } as unknown as NodeJS.ProcessEnv),
    ).toEqual({ perDay: 5, minIntervalMs: 15_000 });
  });

  it("falls back to defaults for absent or invalid values", () => {
    const defaults = { perDay: 50, minIntervalMs: 3_000 };
    expect(generationQuota({} as unknown as NodeJS.ProcessEnv)).toEqual(defaults);
    for (const bad of ["0", "-1", "abc", "2.5", ""]) {
      expect(
        generationQuota({ AXON_GENERATION_DAILY_LIMIT: bad } as unknown as NodeJS.ProcessEnv),
      ).toEqual(defaults);
    }
  });
});

describe("generation quota", () => {
  it("starts with the full daily allowance", async () => {
    const status = await getQuotaStatus(db, user, T0);
    expect(status).toMatchObject({ used: 0, limit: QUOTA.perDay });
  });

  it("consumes one generation and decrements remaining", async () => {
    const outcome = await consumeGeneration(db, user, T0);
    expect(outcome.allowed).toBe(true);
    if (outcome.allowed) {
      expect(outcome.status.used).toBe(1);
      expect(outcome.status.remaining).toBe(QUOTA.perDay - 1);
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
    const second = await consumeGeneration(db, user, later(QUOTA.minIntervalMs + 1));
    expect(second.allowed).toBe(true);
  });

  it("blocks once the daily quota is exhausted", async () => {
    // Space requests past the rate limit to isolate the daily cap.
    for (let i = 0; i < QUOTA.perDay; i += 1) {
      const outcome = await consumeGeneration(db, user, later(i * QUOTA.minIntervalMs));
      expect(outcome.allowed).toBe(true);
    }
    const overflow = await consumeGeneration(db, user, later(QUOTA.perDay * QUOTA.minIntervalMs));
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
