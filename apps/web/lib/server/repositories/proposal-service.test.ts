import { type ArchitectureProposal } from "@axon/repo-intel";
import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ProposalService } from "./proposal-service";
import { ServerGithubRepository } from "./server-github-repository";
import { ServerProjectRepository } from "./server-project-repository";
import { type Database } from "../db/client";
import { architectureProposals, documents } from "../db/schema";
import { createTestDatabase, resetTestDatabase } from "../db/testing";
import { seedUser } from "../test-support/seed";

let db: Database;

beforeAll(async () => {
  db = await createTestDatabase();
});
beforeEach(async () => {
  await resetTestDatabase(db);
});

const PROPOSAL: ArchitectureProposal = {
  schemaVersion: "1.0",
  sourceRepositoryFullName: "org/repo",
  sourceCommitSha: "abc1234",
  components: [
    { id: "api", name: "API", category: "service", technology: "Express", confidence: "high", evidenceIds: ["e1"], review: "accepted" },
    { id: "db", name: "Postgres", category: "database", technology: "PostgreSQL", confidence: "high", evidenceIds: ["e2"], review: "accepted" },
    { id: "cache", name: "Redis", category: "cache", confidence: "low", evidenceIds: ["e3"], review: "rejected" },
  ],
  relationships: [
    { id: "api-db", source: "api", target: "db", kind: "data", confidence: "high", evidenceIds: ["e4"], review: "accepted" },
  ],
  conflicts: [],
  unresolved: [],
  createdAt: "2026-07-24T00:00:00.000Z",
};

async function seed(email: string): Promise<{ userId: string; projectId: string; proposalId: string }> {
  const userId = await seedUser(db, email);
  const project = await new ServerProjectRepository(db, userId).createProject({
    name: "P",
    template: "blank",
  });
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
  const inserted = await db
    .insert(architectureProposals)
    .values({
      ownerId: userId,
      repositoryConnectionId: repo.id,
      sourceCommitSha: "abc1234",
      status: "draft",
      proposal: PROPOSAL,
    })
    .returning({ id: architectureProposals.id });
  const proposalId = inserted[0]?.id;
  if (proposalId === undefined) throw new Error("seed proposal failed");
  return { userId, projectId: project.project.id, proposalId };
}

async function loadDoc(projectId: string) {
  const rows = await db.select().from(documents).where(eq(documents.projectId, projectId)).limit(1);
  return rows[0];
}

describe("ProposalService.applyProposal (real DB)", () => {
  it("merges only accepted items into a new document revision", async () => {
    const { userId, projectId, proposalId } = await seed("a@example.com");
    await new ProposalService(db, userId).applyProposal(proposalId, projectId);

    const doc = await loadDoc(projectId);
    expect(doc?.version).toBe(2); // blank project started at v1
    const nodes = (doc?.document as { nodes: { id: string }[] }).nodes;
    const edges = (doc?.document as { edges: { id: string }[] }).edges;
    expect(nodes.map((n) => n.id).sort()).toEqual(["api", "db"]); // "cache" was rejected
    expect(edges.map((e) => e.id)).toEqual(["api-db"]);

    const proposal = (
      await db.select().from(architectureProposals).where(eq(architectureProposals.id, proposalId))
    )[0];
    expect(proposal?.status).toBe("applied");
    expect(proposal?.projectId).toBe(projectId);
  });

  it("refuses to apply the same proposal twice", async () => {
    const { userId, projectId, proposalId } = await seed("a@example.com");
    const service = new ProposalService(db, userId);
    await service.applyProposal(proposalId, projectId);
    await expect(service.applyProposal(proposalId, projectId)).rejects.toThrow(/already applied/i);
  });

  it("applies sequential proposals under version-guarded writes", async () => {
    const { userId, projectId, proposalId } = await seed("a@example.com");
    const svc = new ProposalService(db, userId);

    await svc.applyProposal(proposalId, projectId);
    expect((await loadDoc(projectId))?.version).toBe(2);

    // A second reviewed proposal applies on top, guarded by the new version.
    const repoConnId = (
      await db.select().from(architectureProposals).where(eq(architectureProposals.id, proposalId))
    )[0]?.repositoryConnectionId;
    if (repoConnId === undefined) throw new Error("expected a repo connection");
    const second = await db
      .insert(architectureProposals)
      .values({
        ownerId: userId,
        repositoryConnectionId: repoConnId,
        sourceCommitSha: "def5678",
        status: "draft",
        proposal: {
          ...PROPOSAL,
          components: [
            {
              id: "worker",
              name: "Worker",
              category: "service",
              confidence: "high",
              evidenceIds: ["e9"],
              review: "accepted",
            },
          ],
          relationships: [],
        },
      })
      .returning({ id: architectureProposals.id });
    const secondId = second[0]?.id;
    if (secondId === undefined) throw new Error("seed second proposal failed");

    await svc.applyProposal(secondId, projectId);
    const doc = await loadDoc(projectId);
    expect(doc?.version).toBe(3);
    const nodeIds = (doc?.document as { nodes: { id: string }[] }).nodes.map((n) => n.id).sort();
    expect(nodeIds).toEqual(["api", "db", "worker"]); // prior revision preserved
  });

  it("does not let another user apply a proposal they do not own", async () => {
    const { projectId, proposalId } = await seed("a@example.com");
    const intruder = new ProposalService(db, await seedUser(db, "b@example.com"));
    await expect(intruder.applyProposal(proposalId, projectId)).rejects.toThrow(/not found/i);
  });
});
