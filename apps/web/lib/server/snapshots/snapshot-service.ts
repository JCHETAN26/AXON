import { and, eq, desc } from "drizzle-orm";
import { 
  type ArchitectureDocument, 
  type SnapshotCreationReason, 
  computeSemanticHash, 
  computeSemanticDocumentDiff,
  type SemanticDiffResult
} from "@axon/diagram-schema";

import { type Database } from "../db/client";
import { architectureSnapshots, architectureDrifts, documents } from "../db/schema";

export class SnapshotService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string
  ) {}

  async createSnapshot(
    projectId: string,
    document: ArchitectureDocument,
    version: number,
    creationReason: SnapshotCreationReason,
    previousSnapshotId?: string
  ): Promise<string> {
    const semanticHash = computeSemanticHash(document);

    // Get previous snapshot to chain
    let prevId = previousSnapshotId;
    if (!prevId) {
      const prevRows = await this.db
        .select({ id: architectureSnapshots.id })
        .from(architectureSnapshots)
        .where(
          and(
            eq(architectureSnapshots.projectId, projectId),
            eq(architectureSnapshots.ownerId, this.ownerId)
          )
        )
        .orderBy(desc(architectureSnapshots.createdAt))
        .limit(1);

      if (prevRows[0]) {
        prevId = prevRows[0].id;
      }
    }

    const inserted = await this.db
      .insert(architectureSnapshots)
      .values({
        ownerId: this.ownerId,
        projectId,
        documentVersion: version,
        payload: document,
        creationReason,
        createdByUserId: this.ownerId,
        previousSnapshotId: prevId,
        semanticHash,
        status: "active",
      })
      .returning({ id: architectureSnapshots.id });

    const newId = inserted[0]?.id;
    if (!newId) throw new Error("Failed to create snapshot");
    return newId;
  }

  async listSnapshots(projectId: string) {
    return this.db
      .select()
      .from(architectureSnapshots)
      .where(
        and(
          eq(architectureSnapshots.projectId, projectId),
          eq(architectureSnapshots.ownerId, this.ownerId)
        )
      )
      .orderBy(desc(architectureSnapshots.createdAt));
  }

  async getSnapshot(snapshotId: string) {
    const rows = await this.db
      .select()
      .from(architectureSnapshots)
      .where(
        and(
          eq(architectureSnapshots.id, snapshotId),
          eq(architectureSnapshots.ownerId, this.ownerId)
        )
      )
      .limit(1);

    const row = rows[0];
    if (!row) throw new Error("Snapshot not found");
    return row;
  }

  async compareSnapshots(baseSnapshotId: string, comparedSnapshotId: string): Promise<SemanticDiffResult> {
    const base = await this.getSnapshot(baseSnapshotId);
    const compared = await this.getSnapshot(comparedSnapshotId);

    const baseDoc = base.payload as unknown as ArchitectureDocument;
    const comparedDoc = compared.payload as unknown as ArchitectureDocument;

    const diff = computeSemanticDocumentDiff(baseDoc, comparedDoc);
    diff.baseVersion = base.documentVersion;
    diff.targetVersion = compared.documentVersion;
    return diff;
  }

  async restoreSnapshot(projectId: string, snapshotId: string): Promise<number> {
    const snapshot = await this.getSnapshot(snapshotId);
    const snapshotDoc = snapshot.payload as unknown as ArchitectureDocument;

    // Get current document
    const docRows = await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.projectId, projectId),
          eq(documents.ownerId, this.ownerId)
        )
      )
      .limit(1);

    const currentDocRow = docRows[0];
    if (!currentDocRow) throw new Error("Document not found");

    const newVersion = currentDocRow.version + 1;
    const updatedDoc: ArchitectureDocument = {
      ...snapshotDoc,
      updatedAt: new Date().toISOString(),
    };

    // Optimistic concurrency write
    await this.db.transaction(async (tx) => {
      await tx
        .update(documents)
        .set({
          document: updatedDoc,
          version: newVersion,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(documents.projectId, projectId),
            eq(documents.version, currentDocRow.version)
          )
        );

      await tx.insert(architectureSnapshots).values({
        ownerId: this.ownerId,
        projectId,
        documentVersion: newVersion,
        payload: updatedDoc,
        creationReason: "manual-snapshot",
        createdByUserId: this.ownerId,
        previousSnapshotId: snapshotId,
        semanticHash: computeSemanticHash(updatedDoc),
        status: "active",
      });
    });

    return newVersion;
  }

  async listDriftItems(projectId: string) {
    return this.db
      .select()
      .from(architectureDrifts)
      .where(
        and(
          eq(architectureDrifts.projectId, projectId),
          eq(architectureDrifts.ownerId, this.ownerId)
        )
      )
      .orderBy(desc(architectureDrifts.createdAt));
  }

  async resolveDrift(
    driftId: string,
    decision: "accepted" | "rejected" | "acknowledged"
  ): Promise<void> {
    await this.db
      .update(architectureDrifts)
      .set({
        userDecision: decision,
        status: decision === "accepted" ? "accepted" : decision === "rejected" ? "rejected" : "acknowledged",
        resolvedAt: new Date(),
      })
      .where(
        and(
          eq(architectureDrifts.id, driftId),
          eq(architectureDrifts.ownerId, this.ownerId)
        )
      );
  }
}
