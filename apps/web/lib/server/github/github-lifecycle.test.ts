import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { deleteAccount } from "../account-deletion";
import { type Database } from "../db/client";
import {
  architectureProposals,
  connectedRepositories,
  documents,
  githubInstallations,
  repositoryAnalysisRuns,
  repositoryEvidence,
} from "../db/schema";
import { createTestDatabase, resetTestDatabase } from "../db/testing";
import { collectAccountExport } from "../export/collect-export";
import { ServerGithubRepository } from "../repositories/server-github-repository";
import { ServerProjectRepository } from "../repositories/server-project-repository";
import { seedUser } from "../test-support/seed";

let db: Database;

beforeAll(async () => {
  db = await createTestDatabase();
});
beforeEach(async () => {
  await resetTestDatabase(db);
});

/** Seeds a user with an installation, connected repo, a project, and a full
 * analysis lineage (run + evidence + proposal). Returns the key ids. */
async function seedFull(email: string) {
  const userId = await seedUser(db, email);
  const store = new ServerGithubRepository(db, userId);
  const installation = await store.linkInstallation({
    installationId: 100,
    accountId: 200,
    accountLogin: "acme",
    accountType: "Organization",
    permissions: { metadata: "read", contents: "read" },
  });
  const repo = await store.connectRepository(installation.id, {
    repoGithubId: 555,
    ownerLogin: "acme",
    name: "api",
    fullName: "acme/api",
    defaultBranch: "main",
    visibility: "private",
    archived: false,
    url: "https://github.com/acme/api",
  });
  if (repo === null) throw new Error("seed repo failed");
  const project = await new ServerProjectRepository(db, userId).createProject({
    name: "P",
    template: "blank",
  });

  const run = await db
    .insert(repositoryAnalysisRuns)
    .values({ ownerId: userId, repositoryConnectionId: repo.id, commitSha: "sha1", status: "succeeded" })
    .returning({ id: repositoryAnalysisRuns.id });
  const runId = run[0]?.id;
  if (runId === undefined) throw new Error("seed run failed");
  await db.insert(repositoryEvidence).values({
    ownerId: userId,
    analysisRunId: runId,
    repositoryConnectionId: repo.id,
    commitSha: "sha1",
    filePath: "package.json",
    evidenceType: "dependency",
    extractor: "package-json",
    fact: { technology: "PostgreSQL", category: "database" },
    confidence: "low",
  });
  await db.insert(architectureProposals).values({
    ownerId: userId,
    repositoryConnectionId: repo.id,
    sourceCommitSha: "sha1",
    status: "draft",
    proposal: { schemaVersion: "1.0", components: [], relationships: [] },
  });
  return { userId, repoConnId: repo.id, projectId: project.project.id };
}

describe("CP5 lifecycle (real DB)", () => {
  it("account export includes GitHub connections with safe metadata only", async () => {
    const { userId } = await seedFull("a@example.com");
    const result = await collectAccountExport(db, userId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.bundle.githubConnections).toHaveLength(1);
    const conn = result.bundle.githubConnections[0];
    expect(conn?.accountLogin).toBe("acme");
    expect(conn?.repositories[0]?.fullName).toBe("acme/api");
    expect(conn?.repositories[0]?.analysisRunCount).toBe(1);
    expect(conn?.repositories[0]?.proposalCount).toBe(1);

    // No tokens or private keys anywhere in the export.
    expect(JSON.stringify(result.bundle)).not.toMatch(
      /access_token|refresh_token|BEGIN [A-Z ]*PRIVATE KEY/i,
    );
    // The connections section exposes no installation id, account id, token, or
    // raw permissions snapshot — only safe display metadata.
    expect(JSON.stringify(result.bundle.githubConnections)).not.toMatch(
      /installationId|installation_id|accountId|account_id|token|permission/i,
    );
  });

  it("account deletion cascades all repository-intelligence data", async () => {
    const { userId } = await seedFull("a@example.com");
    const result = await deleteAccount(db, userId);
    expect(result.ok).toBe(true);

    for (const rows of [
      await db.select().from(githubInstallations).where(eq(githubInstallations.ownerId, userId)),
      await db.select().from(connectedRepositories).where(eq(connectedRepositories.ownerId, userId)),
      await db.select().from(repositoryAnalysisRuns).where(eq(repositoryAnalysisRuns.ownerId, userId)),
      await db.select().from(repositoryEvidence).where(eq(repositoryEvidence.ownerId, userId)),
      await db.select().from(architectureProposals).where(eq(architectureProposals.ownerId, userId)),
    ]) {
      expect(rows).toHaveLength(0);
    }
  });

  it("disconnecting a repository removes its analysis data but preserves applied documents", async () => {
    const { userId, repoConnId, projectId } = await seedFull("a@example.com");
    await new ServerGithubRepository(db, userId).disconnectRepository(repoConnId);

    // Analysis lineage for that repo is gone (FK cascade from the connection).
    expect(
      await db.select().from(repositoryEvidence).where(eq(repositoryEvidence.repositoryConnectionId, repoConnId)),
    ).toHaveLength(0);
    expect(
      await db.select().from(architectureProposals).where(eq(architectureProposals.repositoryConnectionId, repoConnId)),
    ).toHaveLength(0);
    // The project's applied ArchitectureDocument is preserved.
    expect(await db.select().from(documents).where(eq(documents.projectId, projectId))).toHaveLength(1);
  });
});
