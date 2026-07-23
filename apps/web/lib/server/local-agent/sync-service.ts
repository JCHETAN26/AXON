import { and, eq, desc } from "drizzle-orm";
import { type RepositoryEvidence, type ArchitectureProposal } from "@axon/repo-intel";

import { type Database } from "../db/client";
import {
  localAgentConnections,
  localEvidenceSyncRuns,
  localSynchronizedEvidence,
} from "../db/schema";

export interface SyncReviewItem {
  evidenceId: string;
  filePath: string;
  evidenceType: string;
  technology?: string;
  category?: string;
  included: boolean;
}

export interface EvidenceSyncRequest {
  agentConnectionId: string;
  projectId?: string;
  evidence: RepositoryEvidence[];
  proposal: ArchitectureProposal;
  excludedEvidenceIds?: string[];
  localAnalysisVersion?: string;
  localWorkspaceSnapshotId?: string;
}

export interface SyncRunRecord {
  id: string;
  agentConnectionId: string;
  projectId: string | null;
  evidenceCount: number;
  componentCount: number;
  status: string;
  syncedAt: Date | null;
  createdAt: Date;
}

/**
 * Manages evidence synchronization from local MCP agents to hosted workspaces.
 *
 * Synchronization is always opt-in and reviewable. Evidence must be explicitly
 * approved before it updates hosted architecture. The hosted architecture is
 * NEVER updated automatically by sync.
 */
export class EvidenceSyncService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
  ) {}

  /**
   * Build a review manifest showing what would be synchronized.
   * Users must review this before approving sync.
   */
  buildReviewManifest(
    evidence: RepositoryEvidence[],
    excludedIds: Set<string> = new Set<string>(),
  ): SyncReviewItem[] {
    return evidence.map((ev) => {
      const item: SyncReviewItem = {
        evidenceId: ev.id,
        filePath: ev.filePath,
        evidenceType: ev.evidenceType,
        included: !excludedIds.has(ev.id),
      };
      if (ev.fact.technology !== undefined) item.technology = ev.fact.technology;
      if (ev.fact.category !== undefined) item.category = ev.fact.category;
      return item;
    });
  }

  /**
   * Submit approved evidence for synchronization.
   * Creates a sync run record but does NOT automatically update hosted architecture.
   */
  async submitSync(
    request: EvidenceSyncRequest,
  ): Promise<{ syncRunId: string; persistedEvidenceCount: number }> {
    // Verify agent connection is valid and not revoked
    const agentRows = await this.db
      .select()
      .from(localAgentConnections)
      .where(
        and(
          eq(localAgentConnections.id, request.agentConnectionId),
          eq(localAgentConnections.ownerId, this.ownerId),
        ),
      )
      .limit(1);

    const agent = agentRows[0];
    if (!agent) throw new Error("Agent connection not found");
    if (agent.revokedAt) throw new Error("Agent connection has been revoked");
    if (
      request.projectId !== undefined &&
      agent.workspaceScope !== "*" &&
      agent.workspaceScope !== request.projectId
    ) {
      throw new Error("Agent connection is not scoped to this project");
    }

    // Filter out excluded evidence
    const excludedSet = new Set(request.excludedEvidenceIds ?? []);
    const includedEvidence = request.evidence.filter((ev) => !excludedSet.has(ev.id));

    const componentCount = request.proposal.components.length;

    const syncedAt = new Date();
    const inserted = await this.db
      .insert(localEvidenceSyncRuns)
      .values({
        ownerId: this.ownerId,
        agentConnectionId: request.agentConnectionId,
        projectId: request.projectId ?? null,
        evidenceCount: includedEvidence.length,
        componentCount,
        status: "synced",
        syncedAt,
      })
      .returning({ id: localEvidenceSyncRuns.id });

    const syncRunId = inserted[0]?.id;
    if (!syncRunId) throw new Error("Failed to create sync run record");

    if (includedEvidence.length > 0) {
      await this.db.insert(localSynchronizedEvidence).values(
        includedEvidence.map((ev) => ({
          ownerId: this.ownerId,
          syncRunId,
          agentConnectionId: request.agentConnectionId,
          projectId: request.projectId ?? null,
          localEvidenceId: ev.id,
          filePath: ev.filePath,
          startLine: ev.startLine,
          endLine: ev.endLine,
          evidenceType: ev.evidenceType,
          extractor: ev.extractor,
          excerpt: ev.excerpt,
          fact: ev.fact,
          confidence: ev.confidence,
          provenance: "locally-observed",
          redactionStatus: ev.excerpt ? "redacted-excerpt" : "no-excerpt",
          localAnalysisVersion: request.localAnalysisVersion ?? "repo-intel-local",
          localWorkspaceSnapshotId:
            request.localWorkspaceSnapshotId ?? request.proposal.sourceCommitSha,
          rawSourceRetained: false,
          syncedAt,
        })),
      );
    }

    return { syncRunId, persistedEvidenceCount: includedEvidence.length };
  }

  /**
   * List sync runs for the current user.
   */
  async listSyncRuns(): Promise<SyncRunRecord[]> {
    const rows = await this.db
      .select()
      .from(localEvidenceSyncRuns)
      .where(eq(localEvidenceSyncRuns.ownerId, this.ownerId))
      .orderBy(desc(localEvidenceSyncRuns.createdAt));

    return rows.map((r) => ({
      id: r.id,
      agentConnectionId: r.agentConnectionId,
      projectId: r.projectId,
      evidenceCount: r.evidenceCount,
      componentCount: r.componentCount,
      status: r.status,
      syncedAt: r.syncedAt,
      createdAt: r.createdAt,
    }));
  }
}
