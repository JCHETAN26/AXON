import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { RepositoryInventoryService } from "./repository-inventory";
import { ServerGithubRepository } from "./server-github-repository";
import { type Database } from "../db/client";
import { architectureProposals, repositoryAnalysisRuns, repositoryEvidence } from "../db/schema";
import { createTestDatabase, resetTestDatabase } from "../db/testing";
import { type GithubGateway, type RemoteTree } from "../github/gateway";
import { seedUser } from "../test-support/seed";

let db: Database;

beforeAll(async () => {
  db = await createTestDatabase();
});
beforeEach(async () => {
  await resetTestDatabase(db);
});

/** A gateway serving a one-file repo tree (package.json declaring `pg`). */
function fakeGateway(): GithubGateway {
  const tree: RemoteTree = {
    commitSha: "sha123",
    entries: [{ path: "package.json", type: "blob", size: 60, special: false }],
    truncated: false,
  };
  return {
    verifyInstallation: vi.fn(),
    listInstallationRepositories: vi.fn(),
    getBranchHeadSha: vi.fn().mockResolvedValue("sha123"),
    getTree: vi.fn().mockResolvedValue(tree),
    getFileText: vi.fn().mockResolvedValue(JSON.stringify({ dependencies: { pg: "^8.0.0" } })),
    listPullRequests: vi.fn(),
    getPullRequestFiles: vi.fn(),
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
  if (repo === null) throw new Error("seed repo failed");
  return { userId, repoConnId: repo.id };
}

describe("RepositoryInventoryService.runAnalysis (real DB)", () => {
  it("analyzes a connected repo into evidence and a draft proposal", async () => {
    const { userId, repoConnId } = await seedRepo("a@example.com");
    const store = new ServerGithubRepository(db, userId);
    const service = new RepositoryInventoryService(db, userId, fakeGateway(), store);

    const runId = await service.runAnalysis(repoConnId, userId);
    expect(runId).toBeTruthy();

    const run = (
      await db.select().from(repositoryAnalysisRuns).where(eq(repositoryAnalysisRuns.id, runId))
    )[0];
    expect(run?.status).toBe("succeeded");
    expect(run?.commitSha).toBe("sha123");

    const evidence = await db
      .select()
      .from(repositoryEvidence)
      .where(eq(repositoryEvidence.analysisRunId, runId));
    expect(evidence.length).toBeGreaterThanOrEqual(1);
    // The `pg` dependency became PostgreSQL evidence tied to package.json.
    expect(evidence.some((e) => e.filePath === "package.json")).toBe(true);

    const proposals = await db
      .select()
      .from(architectureProposals)
      .where(eq(architectureProposals.repositoryConnectionId, repoConnId));
    expect(proposals).toHaveLength(1);
    const proposal = proposals[0]?.proposal as { components: { technology?: string }[] };
    expect(proposal.components.some((c) => c.technology === "PostgreSQL")).toBe(true);
  });

  it("does not analyze a repo another user does not own", async () => {
    const { repoConnId } = await seedRepo("a@example.com");
    const intruderId = await seedUser(db, "b@example.com");
    const intruderStore = new ServerGithubRepository(db, intruderId);
    const service = new RepositoryInventoryService(db, intruderId, fakeGateway(), intruderStore);
    await expect(service.runAnalysis(repoConnId, intruderId)).rejects.toThrow(/not found|access denied/i);
  });
});
