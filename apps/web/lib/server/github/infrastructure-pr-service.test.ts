import { type ArchitectureProposal } from "@axon/repo-intel";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { InfrastructurePrService } from "./infrastructure-pr-service";
import { type GithubGateway } from "./gateway";
import { type Database } from "../db/client";
import { architectureProposals } from "../db/schema";
import { createTestDatabase, resetTestDatabase } from "../db/testing";
import { ServerGithubRepository } from "../repositories/server-github-repository";
import { seedUser } from "../test-support/seed";

const PROPOSAL: ArchitectureProposal = {
  schemaVersion: "1.0",
  sourceRepositoryFullName: "org/repo",
  sourceCommitSha: "abc1234",
  components: [
    {
      id: "comp-1",
      name: "API Service",
      category: "compute",
      technology: "aws_instance",
      confidence: "high",
      evidenceIds: ["ev-1"],
      review: "accepted",
    },
  ],
  relationships: [],
  conflicts: [],
  unresolved: [],
  createdAt: "2026-04-01T00:00:00Z",
};

function fakeGateway(): GithubGateway {
  return {
    verifyInstallation: vi.fn(),
    listInstallationRepositories: vi.fn(),
    getBranchHeadSha: vi.fn(),
    getTree: vi.fn(),
    getFileText: vi.fn(),
    listPullRequests: vi.fn(),
    getPullRequestFiles: vi.fn(),
    postPullRequestComment: vi.fn(),
    createBranchAndPullRequest: vi.fn().mockResolvedValue({
      prNumber: 99,
      prUrl: "https://github.com/org/repo/pull/99",
    }),
  } as unknown as GithubGateway;
}

let db: Database;

beforeAll(async () => {
  db = await createTestDatabase();
});
beforeEach(async () => {
  await resetTestDatabase(db);
});

/** Seeds a user with an installation, one connected repo, and a proposal. */
async function seedRepo(
  email: string,
): Promise<{ userId: string; repoConnId: string; proposalId: string }> {
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

  const proposalRows = await db
    .insert(architectureProposals)
    .values({
      ownerId: userId,
      repositoryConnectionId: repo.id,
      sourceCommitSha: "abc1234",
      status: "ready",
      proposal: PROPOSAL,
    })
    .returning({ id: architectureProposals.id });
  const proposalId = proposalRows[0]?.id;
  if (proposalId === undefined) throw new Error("failed to seed proposal");
  return { userId, repoConnId: repo.id, proposalId };
}

describe("InfrastructurePrService (real DB)", () => {
  it("generates HCL/YAML, opens a PR, and records it against the owned repo", async () => {
    const { userId, repoConnId, proposalId } = await seedRepo("a@example.com");
    const gateway = fakeGateway();
    const service = new InfrastructurePrService(db, userId, gateway);

    const result = await service.submitControlledPr(repoConnId, PROPOSAL, proposalId, "main");

    expect(result.prNumber).toBe(99);
    expect(result.prUrl).toContain("/pull/99");
    expect(result.generated.terraformHcl).toContain('resource "aws_instance" "comp_1"');
    expect(gateway.createBranchAndPullRequest).toHaveBeenCalled();

    // The run is recorded and visible to the owner.
    const recorded = await service.listControlledPrs(repoConnId);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.prNumber).toBe(99);
  });

  it("does not let another user submit against a repo they do not own", async () => {
    const { repoConnId, proposalId } = await seedRepo("a@example.com");
    const intruderId = await seedUser(db, "b@example.com");
    const service = new InfrastructurePrService(db, intruderId, fakeGateway());

    await expect(
      service.submitControlledPr(repoConnId, PROPOSAL, proposalId, "main"),
    ).rejects.toThrow(/not found/i);

    // And the intruder sees no controlled PRs for that repo.
    expect(await service.listControlledPrs(repoConnId)).toHaveLength(0);
  });
});
