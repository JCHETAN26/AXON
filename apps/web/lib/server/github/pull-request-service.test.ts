import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PullRequestService } from "./pull-request-service";
import { type GithubGateway } from "./gateway";
import { type Database } from "../db/client";
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

function fakeGateway(files: { filename: string }[]): GithubGateway {
  return {
    verifyInstallation: vi.fn(),
    listInstallationRepositories: vi.fn(),
    getBranchHeadSha: vi.fn(),
    getTree: vi.fn(),
    getFileText: vi.fn(),
    listPullRequests: vi.fn().mockResolvedValue([
      { number: 7, title: "Add infra", author: "dev", state: "open", headSha: "h7", baseSha: "b7", createdAt: "" },
    ]),
    getPullRequestFiles: vi.fn().mockResolvedValue(files),
    postPullRequestComment: vi.fn().mockResolvedValue(undefined),
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
    permissions: { metadata: "read", contents: "read", pull_requests: "read" },
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

describe("PullRequestService (real DB)", () => {
  it("analyzes a PR, records a run, and rates IaC changes high risk", async () => {
    const { userId, repoConnId } = await seedRepo("a@example.com");
    const service = new PullRequestService(db, fakeGateway([{ filename: "infra/main.tf" }]), userId);

    const { runId, summary } = await service.analyzePullRequest(repoConnId, 7);
    expect(runId).toBeTruthy();
    expect(summary.risk).toBe("high");
    expect(summary.changedFilesCount).toBe(1);

    const runs = await service.listPullRequestRuns(repoConnId);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.prNumber).toBe(7);
  });

  it("does not let another user analyze a repo they do not own", async () => {
    const { repoConnId } = await seedRepo("a@example.com");
    const intruder = new PullRequestService(
      db,
      fakeGateway([{ filename: "src/x.ts" }]),
      await seedUser(db, "b@example.com"),
    );
    await expect(intruder.analyzePullRequest(repoConnId, 7)).rejects.toThrow(/not found/i);
    expect(await intruder.listPullRequestRuns(repoConnId)).toHaveLength(0);
  });
});
