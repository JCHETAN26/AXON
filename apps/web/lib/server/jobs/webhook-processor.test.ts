import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { drainWebhookJobs, processWebhookJob } from "./webhook-processor";
import { enqueueJob, type Job } from "./job-store";
import { type Database } from "../db/client";
import { githubPrAnalysisRuns } from "../db/schema";
import { createTestDatabase, resetTestDatabase } from "../db/testing";
import { type GithubGateway } from "../github/gateway";
import { ServerGithubRepository } from "../repositories/server-github-repository";
import { seedUser } from "../test-support/seed";

let db: Database;

beforeAll(async () => {
  db = await createTestDatabase();
});
beforeEach(async () => {
  await resetTestDatabase(db);
});

function fakeGateway(): GithubGateway {
  return {
    verifyInstallation: vi.fn(),
    listInstallationRepositories: vi.fn(),
    getBranchHeadSha: vi.fn(),
    getTree: vi.fn(),
    getFileText: vi.fn(() => Promise.resolve(JSON.stringify({ dependencies: { pg: "^8" } }))),
    listPullRequests: vi
      .fn()
      .mockResolvedValue([
        {
          number: 7,
          title: "t",
          author: "d",
          state: "open",
          headSha: "h",
          baseSha: "b",
          createdAt: "",
        },
      ]),
    getPullRequestFiles: vi
      .fn()
      .mockResolvedValue([
        { filename: "package.json", status: "modified", additions: 1, deletions: 0 },
      ]),
    postPullRequestComment: vi.fn(),
    createBranchAndPullRequest: vi.fn(),
  } as unknown as GithubGateway;
}

async function seedRepo(email: string): Promise<{ userId: string; repoConnId: string }> {
  const userId = await seedUser(db, email);
  const store = new ServerGithubRepository(db, userId);
  const installation = await store.linkInstallation({
    installationId: 100,
    accountId: 200,
    accountLogin: "org",
    accountType: "Organization",
    permissions: { metadata: "read", contents: "read" },
  });
  const repo = await store.connectRepository(installation.id, {
    repoGithubId: 555,
    ownerLogin: "org",
    name: "repo",
    fullName: "org/repo",
    defaultBranch: "main",
    visibility: "private",
    archived: false,
    url: "https://github.com/org/repo",
  });
  if (repo === null) throw new Error("failed to seed repo");
  return { userId, repoConnId: repo.id };
}

describe("webhook-processor (real DB)", () => {
  it("drains a queued pull_request job into a real analysis run", async () => {
    const { userId, repoConnId } = await seedRepo("a@example.com");
    await enqueueJob(db, {
      ownerId: userId,
      kind: "webhook.pull_request",
      idempotencyKey: "delivery-1",
      payload: { repositoryConnectionId: repoConnId, prNumber: 7 },
    });

    const ran = await drainWebhookJobs(db, fakeGateway());
    expect(ran).toBe(1);

    const runs = await db
      .select()
      .from(githubPrAnalysisRuns)
      .where(eq(githubPrAnalysisRuns.repositoryConnectionId, repoConnId));
    expect(runs).toHaveLength(1);
    expect(runs[0]?.prNumber).toBe(7);
  });

  it("acknowledges a push job without creating a PR run", async () => {
    const { userId } = await seedRepo("a@example.com");
    const job = {
      id: "j",
      ownerId: userId,
      kind: "webhook.push",
      payload: { afterSha: "abc" },
    } as unknown as Job;
    await expect(processWebhookJob(db, job, fakeGateway())).resolves.toBeUndefined();
  });

  it("ignores an unowned job", async () => {
    const job = {
      id: "j",
      ownerId: null,
      kind: "webhook.pull_request",
      payload: {},
    } as unknown as Job;
    await expect(processWebhookJob(db, job, fakeGateway())).resolves.toBeUndefined();
  });
});
