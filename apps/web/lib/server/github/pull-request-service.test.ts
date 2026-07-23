import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PullRequestService, PrOutputDisabledError } from "./pull-request-service";
import { GithubError, type GithubGateway } from "./gateway";
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
  delete process.env.AXON_GITHUB_PR_OUTPUT_ENABLED;
});

const HEAD_SHA = "h7";

/**
 * A gateway with a fixed PR (head `h7`, base `b7`), changed-file list, and file
 * contents. A content entry may be a plain string (identical at both commits) or
 * `{ base, head }` to model a file whose content differs between base and head.
 */
function fakeGateway(
  files: { filename: string; status?: "added" | "modified" | "removed" | "renamed" }[],
  contents: Record<string, string | { base?: string; head?: string }> = {},
): GithubGateway {
  return {
    verifyInstallation: vi.fn(),
    listInstallationRepositories: vi.fn(),
    getBranchHeadSha: vi.fn(),
    getTree: vi.fn(),
    getFileText: vi.fn((_i, _o, _r, path: string, sha: string) => {
      const entry = contents[path];
      if (entry === undefined) return Promise.reject(new GithubError("not-found"));
      const value = typeof entry === "string" ? entry : sha === HEAD_SHA ? entry.head : entry.base;
      if (value === undefined) return Promise.reject(new GithubError("not-found"));
      return Promise.resolve(value);
    }),
    listPullRequests: vi
      .fn()
      .mockResolvedValue([
        {
          number: 7,
          title: "Add db",
          author: "dev",
          state: "open",
          headSha: "h7",
          baseSha: "b7",
          createdAt: "",
        },
      ]),
    getPullRequestFiles: vi
      .fn()
      .mockResolvedValue(
        files.map((f) => ({
          filename: f.filename,
          status: f.status ?? "modified",
          additions: 1,
          deletions: 0,
        })),
      ),
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

describe("PullRequestService (real DB, evidence-based)", () => {
  it("extracts real evidence from changed files and derives risk from it", async () => {
    const { userId, repoConnId } = await seedRepo("a@example.com");
    // A newly added package.json that declares a PostgreSQL client — absent at
    // base, so the whole component is introduced by the PR.
    const gateway = fakeGateway([{ filename: "package.json", status: "added" }], {
      "package.json": JSON.stringify({ dependencies: { pg: "^8.0.0" } }),
    });
    const service = new PullRequestService(db, gateway, userId);

    const { summary, proposal } = await service.analyzePullRequest(repoConnId, 7);
    // The proposal is evidence-backed (not empty), and risk reflects real content.
    expect(proposal.components.length).toBeGreaterThanOrEqual(1);
    expect(summary.addedComponentsCount).toBe(proposal.components.length);
    expect(summary.removedComponentsCount).toBe(0);
    expect(summary.risk).toBe("medium");
    // Every component cites evidence.
    expect(proposal.components.every((c) => c.evidenceIds.length > 0)).toBe(true);

    const runs = await service.listPullRequestRuns(repoConnId);
    expect(runs).toHaveLength(1);
  });

  it("reports a component only present at base as removed by the PR", async () => {
    const { userId, repoConnId } = await seedRepo("a@example.com");
    // package.json (with a PostgreSQL client) is deleted in the PR: present at
    // base, gone at head — so the architecture loses a component.
    const gateway = fakeGateway([{ filename: "package.json", status: "removed" }], {
      "package.json": JSON.stringify({ dependencies: { pg: "^8.0.0" } }),
    });
    const service = new PullRequestService(db, gateway, userId);

    const { summary, proposal } = await service.analyzePullRequest(repoConnId, 7);
    expect(proposal.components).toHaveLength(0); // nothing at head
    expect(summary.addedComponentsCount).toBe(0);
    expect(summary.removedComponentsCount).toBeGreaterThanOrEqual(1);
  });

  it("counts a component that a modified file introduces at head as added", async () => {
    const { userId, repoConnId } = await seedRepo("a@example.com");
    // The same file is modified: no dependency at base, a PostgreSQL client at
    // head. Both commits are analyzed; only head yields the component.
    const gateway = fakeGateway([{ filename: "package.json", status: "modified" }], {
      "package.json": {
        base: JSON.stringify({ dependencies: {} }),
        head: JSON.stringify({ dependencies: { pg: "^8.0.0" } }),
      },
    });
    const service = new PullRequestService(db, gateway, userId);

    const { summary } = await service.analyzePullRequest(repoConnId, 7);
    expect(summary.addedComponentsCount).toBeGreaterThanOrEqual(1);
    expect(summary.removedComponentsCount).toBe(0);
    // The base commit was actually fetched (base↔head, not head-only).
    expect(gateway.getFileText).toHaveBeenCalledWith(
      expect.anything(),
      "org",
      "repo",
      "package.json",
      "b7",
      expect.anything(),
    );
  });

  it("rates a PR with no supported changes as no-risk with an empty proposal", async () => {
    const { userId, repoConnId } = await seedRepo("a@example.com");
    const gateway = fakeGateway([{ filename: "README.md" }]);
    const { summary, proposal } = await new PullRequestService(
      db,
      gateway,
      userId,
    ).analyzePullRequest(repoConnId, 7);
    expect(proposal.components).toHaveLength(0);
    expect(summary.risk).toBe("none");
  });

  it("does not let another user analyze a repo they do not own", async () => {
    const { repoConnId } = await seedRepo("a@example.com");
    const intruder = new PullRequestService(
      db,
      fakeGateway([{ filename: "package.json" }]),
      await seedUser(db, "b@example.com"),
    );
    await expect(intruder.analyzePullRequest(repoConnId, 7)).rejects.toThrow(/not found/i);
  });

  it("refuses to post a GitHub comment while write-back is disabled (the default)", async () => {
    const { userId, repoConnId } = await seedRepo("a@example.com");
    const gateway = fakeGateway([{ filename: "package.json" }], {
      "package.json": JSON.stringify({ dependencies: { pg: "^8" } }),
    });
    const service = new PullRequestService(db, gateway, userId);
    const { runId } = await service.analyzePullRequest(repoConnId, 7);

    await expect(service.postPrReviewComment(repoConnId, 7, runId)).rejects.toBeInstanceOf(
      PrOutputDisabledError,
    );
    expect(gateway.postPullRequestComment).not.toHaveBeenCalled();
  });
});
