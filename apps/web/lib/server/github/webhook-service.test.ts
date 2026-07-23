import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { recordWebhookDelivery, type WebhookMeta } from "./webhook-service";
import { type Database } from "../db/client";
import { backgroundJobs } from "../db/schema";
import { createTestDatabase, resetTestDatabase } from "../db/testing";
import { ServerGithubRepository } from "../repositories/server-github-repository";
import { seedUser } from "../test-support/seed";

let db: Database;

beforeAll(async () => {
  db = await createTestDatabase();
});
beforeEach(async () => {
  await resetTestDatabase(db);
});

const INSTALLATION_ID = 100;
const REPO_ID = 555;

async function seedConnectedRepo(email: string): Promise<void> {
  const userId = await seedUser(db, email);
  const store = new ServerGithubRepository(db, userId);
  const installation = await store.linkInstallation({
    installationId: INSTALLATION_ID,
    accountId: 200,
    accountLogin: "org",
    accountType: "Organization",
    permissions: { metadata: "read", contents: "read", pull_requests: "read" },
  });
  await store.connectRepository(installation.id, {
    repoGithubId: REPO_ID,
    ownerLogin: "org",
    name: "repo",
    fullName: "org/repo",
    defaultBranch: "main",
    visibility: "private",
    archived: false,
    url: "https://github.com/org/repo",
  });
}

function meta(overrides: Partial<WebhookMeta>): WebhookMeta {
  return {
    deliveryId: "d1",
    eventType: "pull_request",
    installationId: INSTALLATION_ID,
    repositoryGithubId: REPO_ID,
    prNumber: 7,
    beforeSha: null,
    afterSha: null,
    ...overrides,
  };
}

async function jobCount(): Promise<number> {
  return (await db.select().from(backgroundJobs)).length;
}

describe("recordWebhookDelivery (real DB)", () => {
  it("queues a job for a pull_request on a connected repo", async () => {
    await seedConnectedRepo("a@example.com");
    const outcome = await recordWebhookDelivery(db, meta({}));
    expect(outcome.kind).toBe("queued");
    expect(await jobCount()).toBe(1);
  });

  it("is idempotent: a duplicate delivery id creates no second job", async () => {
    await seedConnectedRepo("a@example.com");
    expect((await recordWebhookDelivery(db, meta({}))).kind).toBe("queued");
    expect((await recordWebhookDelivery(db, meta({}))).kind).toBe("duplicate");
    expect(await jobCount()).toBe(1);
  });

  it("ignores an event for an unlinked installation (unowned)", async () => {
    const outcome = await recordWebhookDelivery(db, meta({ installationId: 999999 }));
    expect(outcome).toEqual({ kind: "ignored", reason: "unowned" });
    expect(await jobCount()).toBe(0);
  });

  it("ignores an analysis event for a repo that is not connected", async () => {
    await seedConnectedRepo("a@example.com");
    const outcome = await recordWebhookDelivery(db, meta({ repositoryGithubId: 424242 }));
    expect(outcome).toEqual({ kind: "ignored", reason: "repo-not-connected" });
    expect(await jobCount()).toBe(0);
  });

  it("ignores a non-analysis event (e.g. installation) without a job", async () => {
    await seedConnectedRepo("a@example.com");
    const outcome = await recordWebhookDelivery(
      db,
      meta({ eventType: "installation", repositoryGithubId: null, prNumber: null }),
    );
    expect(outcome).toEqual({ kind: "ignored", reason: "no-analysis" });
    expect(await jobCount()).toBe(0);
  });

  it("queues a push event and records the job as owner-scoped", async () => {
    await seedConnectedRepo("a@example.com");
    const outcome = await recordWebhookDelivery(
      db,
      meta({ eventType: "push", prNumber: null, beforeSha: "aaa", afterSha: "bbb" }),
    );
    expect(outcome.kind).toBe("queued");
    const jobs = await db.select().from(backgroundJobs).where(eq(backgroundJobs.kind, "webhook.push"));
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.ownerId).not.toBeNull();
  });
});
