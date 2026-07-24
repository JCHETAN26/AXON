import { describe, it, expect, vi } from "vitest";
import { eq } from "drizzle-orm";

import { EvidenceSyncService } from "./sync-service";
import type { Database } from "../db/client";
import type { RepositoryEvidence, ArchitectureProposal } from "@axon/repo-intel";
import { createTestDatabase, resetTestDatabase } from "../db/testing";
import { localAgentConnections, localSynchronizedEvidence, users } from "../db/schema";

const EVIDENCE: RepositoryEvidence[] = [
  {
    id: "ev-1",
    filePath: "src/server.ts",
    evidenceType: "dependency",
    extractor: "package-json",
    confidence: "high",
    fact: { technology: "Express", category: "web-framework" },
  },
  {
    id: "ev-2",
    filePath: "src/db.ts",
    evidenceType: "client-initialization",
    extractor: "source-code",
    confidence: "high",
    fact: { technology: "PostgreSQL", category: "database" },
  },
];

const PROPOSAL: ArchitectureProposal = {
  schemaVersion: "1.0",
  sourceRepositoryFullName: "local://workspace",
  sourceCommitSha: "local",
  components: [
    {
      id: "comp-1",
      name: "Express Server",
      category: "web-framework",
      technology: "express",
      confidence: "high",
      evidenceIds: ["ev-1"],
      review: "proposed",
    },
  ],
  relationships: [],
  conflicts: [],
  unresolved: [],
  createdAt: "2026-01-01T00:00:00Z",
};

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";

function mockDb(agentExists = true, agentRevoked = false) {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(
            agentExists
              ? [
                  {
                    id: "agent-1",
                    ownerId: "user-1",
                    workspaceScope: PROJECT_ID,
                    revokedAt: agentRevoked ? new Date() : null,
                  },
                ]
              : [],
          ),
          orderBy: vi.fn().mockResolvedValue([]),
        }),
        orderBy: vi.fn().mockResolvedValue([]),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "sync-1" }]),
      }),
    }),
  } as unknown as Database;
}

describe("EvidenceSyncService", () => {
  it("builds review manifest from evidence", () => {
    const db = mockDb();
    const service = new EvidenceSyncService(db, "user-1");
    const manifest = service.buildReviewManifest(EVIDENCE);

    expect(manifest).toHaveLength(2);
    expect(manifest[0]?.included).toBe(true);
    expect(manifest[0]?.filePath).toBe("src/server.ts");
  });

  it("excludes evidence by ID in review manifest", () => {
    const db = mockDb();
    const service = new EvidenceSyncService(db, "user-1");
    const manifest = service.buildReviewManifest(EVIDENCE, new Set(["ev-1"]));

    expect(manifest[0]?.included).toBe(false);
    expect(manifest[1]?.included).toBe(true);
  });

  it("submits sync with exclusions", async () => {
    const db = mockDb();
    const service = new EvidenceSyncService(db, "user-1");
    const result = await service.submitSync({
      agentConnectionId: "agent-1",
      projectId: PROJECT_ID,
      evidence: EVIDENCE,
      proposal: PROPOSAL,
      excludedEvidenceIds: ["ev-2"],
    });

    expect(result.syncRunId).toBe("sync-1");
    expect(result.persistedEvidenceCount).toBe(1);
    expect(db.insert).toHaveBeenCalledTimes(2);
  });

  it("rejects sync for revoked agent", async () => {
    const db = mockDb(true, true);
    const service = new EvidenceSyncService(db, "user-1");

    await expect(
      service.submitSync({
        agentConnectionId: "agent-1",
        projectId: PROJECT_ID,
        evidence: EVIDENCE,
        proposal: PROPOSAL,
      }),
    ).rejects.toThrow("revoked");
  });

  it("rejects sync for unknown agent", async () => {
    const db = mockDb(false);
    const service = new EvidenceSyncService(db, "user-1");

    await expect(
      service.submitSync({
        agentConnectionId: "agent-x",
        projectId: PROJECT_ID,
        evidence: EVIDENCE,
        proposal: PROPOSAL,
      }),
    ).rejects.toThrow("not found");
  });

  it("rejects sync outside the agent workspace scope", async () => {
    const db = mockDb();
    const service = new EvidenceSyncService(db, "user-1");

    await expect(
      service.submitSync({
        agentConnectionId: "agent-1",
        projectId: "project-2",
        evidence: EVIDENCE,
        proposal: PROPOSAL,
      }),
    ).rejects.toThrow("not scoped");
  });

  it("persists approved local evidence with provenance and redaction metadata", async () => {
    const db = await createTestDatabase();
    await resetTestDatabase(db);
    const insertedUsers = await db
      .insert(users)
      .values({ email: "local-sync@example.com" })
      .returning({ id: users.id });
    const ownerId = insertedUsers[0]?.id;
    if (!ownerId) throw new Error("failed to insert owner");

    const agents = await db
      .insert(localAgentConnections)
      .values({
        ownerId,
        agentName: "Dev Laptop",
        machineLabel: "macbook",
        tokenHash: "pairing-token-hash",
        credentialHash: "credential-hash",
        workspaceScope: PROJECT_ID,
        allowedCapabilities: ["sync"],
      })
      .returning({ id: localAgentConnections.id });
    const agentConnectionId = agents[0]?.id;
    if (!agentConnectionId) throw new Error("failed to insert agent");

    const service = new EvidenceSyncService(db, ownerId);
    const result = await service.submitSync({
      agentConnectionId,
      projectId: PROJECT_ID,
      evidence: EVIDENCE,
      proposal: PROPOSAL,
      excludedEvidenceIds: ["ev-2"],
      localAnalysisVersion: "local-analyzer-test",
      localWorkspaceSnapshotId: "snapshot-1",
    });

    expect(result.persistedEvidenceCount).toBe(1);

    const rows = await db
      .select()
      .from(localSynchronizedEvidence)
      .where(eq(localSynchronizedEvidence.syncRunId, result.syncRunId));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      ownerId,
      agentConnectionId,
      localEvidenceId: "ev-1",
      filePath: "src/server.ts",
      evidenceType: "dependency",
      extractor: "package-json",
      confidence: "high",
      provenance: "locally-observed",
      redactionStatus: "no-excerpt",
      localAnalysisVersion: "local-analyzer-test",
      localWorkspaceSnapshotId: "snapshot-1",
      rawSourceRetained: false,
    });
  }, 30_000);
});
