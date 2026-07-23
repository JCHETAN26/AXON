import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { claimNextJob, completeJob, enqueueJob, failJob, getJob, runNextJob } from "./job-store";
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

describe("job-store (real DB)", () => {
  it("enqueues idempotently by key", async () => {
    const owner = await seedUser(db, "a@example.com");
    const first = await enqueueJob(db, {
      ownerId: owner,
      kind: "webhook.pull_request",
      idempotencyKey: "delivery-1",
      payload: { n: 1 },
    });
    const second = await enqueueJob(db, {
      ownerId: owner,
      kind: "webhook.pull_request",
      idempotencyKey: "delivery-1",
      payload: { n: 1 },
    });
    // Same delivery id → same job, no duplicate.
    expect(second).toBe(first);
  });

  it("claims a job once, leasing it", async () => {
    const owner = await seedUser(db, "a@example.com");
    await enqueueJob(db, { ownerId: owner, kind: "k", idempotencyKey: "d1", payload: {} });

    const claimed = await claimNextJob(db);
    expect(claimed?.status).toBe("leased");
    expect(claimed?.attempts).toBe(1);
    // Nothing else runnable while it is leased.
    expect(await claimNextJob(db)).toBeNull();
  });

  it("retries until maxAttempts, then dead-letters", async () => {
    const owner = await seedUser(db, "a@example.com");
    await enqueueJob(db, {
      ownerId: owner,
      kind: "k",
      idempotencyKey: "d1",
      payload: {},
      maxAttempts: 2,
    });

    // Attempt 1 fails → retry.
    const j1 = await claimNextJob(db);
    if (j1 === null) throw new Error("expected a job");
    expect(await failJob(db, j1, new Error("boom"))).toBe("retry");

    // Attempt 2 fails → dead-letter (attempts reached max).
    const j2 = await claimNextJob(db);
    if (j2 === null) throw new Error("expected a job");
    expect(await failJob(db, j2, new Error("boom again"))).toBe("dead");

    const dead = await getJob(db, j1.id);
    expect(dead?.status).toBe("dead");
    expect(dead?.lastError).toContain("boom");
  });

  it("runNextJob completes a handler successfully and idempotently drains", async () => {
    const owner = await seedUser(db, "a@example.com");
    await enqueueJob(db, { ownerId: owner, kind: "k", idempotencyKey: "d1", payload: { x: 5 } });

    let seen = 0;
    const outcome = await runNextJob(db, (job) => {
      seen = (job.payload as { x: number }).x;
      return Promise.resolve();
    });
    expect(outcome).toBe("succeeded");
    expect(seen).toBe(5);
    // Drained — nothing left.
    expect(await runNextJob(db, () => Promise.resolve())).toBeNull();
  });

  it("marks a leased job succeeded on completion", async () => {
    const owner = await seedUser(db, "a@example.com");
    await enqueueJob(db, { ownerId: owner, kind: "k", idempotencyKey: "d1", payload: {} });
    const claimed = await claimNextJob(db);
    if (claimed === null) throw new Error("expected a job");
    await completeJob(db, claimed.id);
    expect((await getJob(db, claimed.id))?.status).toBe("succeeded");
  });
});
