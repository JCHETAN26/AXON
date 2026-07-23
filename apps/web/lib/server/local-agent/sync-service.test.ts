import { describe, it, expect, vi } from "vitest";
import { EvidenceSyncService } from "./sync-service";
import type { Database } from "../db/client";
import type { RepositoryEvidence, ArchitectureProposal } from "@axon/repo-intel";

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

function mockDb(agentExists = true, agentRevoked = false) {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(
            agentExists
              ? [{ id: "agent-1", ownerId: "user-1", revokedAt: agentRevoked ? new Date() : null }]
              : []
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
      evidence: EVIDENCE,
      proposal: PROPOSAL,
      excludedEvidenceIds: ["ev-2"],
    });

    expect(result.syncRunId).toBe("sync-1");
  });

  it("rejects sync for revoked agent", async () => {
    const db = mockDb(true, true);
    const service = new EvidenceSyncService(db, "user-1");

    await expect(
      service.submitSync({
        agentConnectionId: "agent-1",
        evidence: EVIDENCE,
        proposal: PROPOSAL,
      })
    ).rejects.toThrow("revoked");
  });

  it("rejects sync for unknown agent", async () => {
    const db = mockDb(false);
    const service = new EvidenceSyncService(db, "user-1");

    await expect(
      service.submitSync({
        agentConnectionId: "agent-x",
        evidence: EVIDENCE,
        proposal: PROPOSAL,
      })
    ).rejects.toThrow("not found");
  });
});
