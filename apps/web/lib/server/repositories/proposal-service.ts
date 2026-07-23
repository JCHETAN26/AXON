import { safeParseArchitectureDocument, type ArchitectureDocument } from "@axon/diagram-schema";
import { type ArchitectureProposal } from "@axon/repo-intel";
import { and, eq } from "drizzle-orm";

import { ConcurrencyError } from "./server-project-repository";
import { type Database } from "../db/client";
import { architectureProposals, documents } from "../db/schema";

export class ProposalService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
  ) {}

  /**
   * Applies a reviewed repository proposal to a project's ArchitectureDocument,
   * creating a new revision. Only accepted items are merged. The result is
   * validated, written under optimistic concurrency (a stale write is rejected,
   * never silently dropped), and the proposal is marked applied. Audit and
   * simulation artifacts become stale by document fingerprint automatically.
   */
  async applyProposal(proposalId: string, projectId: string): Promise<void> {
    const pRows = await this.db
      .select()
      .from(architectureProposals)
      .where(
        and(
          eq(architectureProposals.id, proposalId),
          eq(architectureProposals.ownerId, this.ownerId),
        ),
      )
      .limit(1);

    const proposalRow = pRows[0];
    if (!proposalRow) throw new Error("Proposal not found");
    if (proposalRow.status === "applied") throw new Error("Proposal already applied");

    const proposal = proposalRow.proposal as unknown as ArchitectureProposal;

    const dRows = await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.projectId, projectId), eq(documents.ownerId, this.ownerId)))
      .limit(1);

    const existing = dRows[0];
    const nowIso = new Date().toISOString();
    const baseDoc: ArchitectureDocument = existing
      ? (existing.document as unknown as ArchitectureDocument)
      : {
          schemaVersion: "1.0",
          id: projectId,
          projectId,
          name: "Repository Architecture",
          createdAt: nowIso,
          updatedAt: nowIso,
          source: { kind: "repository" },
          assumptions: [],
          nodes: [],
          edges: [],
          groups: [],
          metadata: { generator: "axon-web" },
        };

    // Merge only accepted items. Components become nodes; relationships become
    // edges when both endpoints are present. Existing entities are preserved.
    const nodes = [...baseDoc.nodes];
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const c of proposal.components.filter((c) => c.review === "accepted")) {
      if (nodeIds.has(c.id)) continue;
      nodes.push({
        id: c.id,
        name: c.name,
        category: c.category,
        ...(c.technology !== undefined && { meta: c.technology }),
      });
      nodeIds.add(c.id);
    }
    const edges = [...baseDoc.edges];
    const edgeIds = new Set(edges.map((e) => e.id));
    for (const r of proposal.relationships.filter((r) => r.review === "accepted")) {
      if (edgeIds.has(r.id) || !nodeIds.has(r.source) || !nodeIds.has(r.target)) continue;
      if (r.source === r.target) continue;
      edges.push({ id: r.id, source: r.source, target: r.target, kind: r.kind });
      edgeIds.add(r.id);
    }

    const nextDoc: ArchitectureDocument = { ...baseDoc, nodes, edges, updatedAt: nowIso };
    const validated = safeParseArchitectureDocument(nextDoc);
    if (!validated.success) {
      throw new Error("Applying the proposal would produce an invalid architecture.");
    }

    await this.db.transaction(async (tx) => {
      if (existing) {
        const updated = await tx
          .update(documents)
          .set({ document: validated.data, version: existing.version + 1, updatedAt: new Date() })
          .where(and(eq(documents.projectId, projectId), eq(documents.version, existing.version)))
          .returning({ version: documents.version });
        // A newer write bumped the version between read and write — reject rather
        // than overwrite. The transaction rolls back, so nothing is applied.
        if (updated.length === 0) throw new ConcurrencyError();
      } else {
        await tx.insert(documents).values({
          projectId,
          ownerId: this.ownerId,
          document: validated.data,
          version: 1,
        });
      }

      await tx
        .update(architectureProposals)
        .set({ status: "applied", projectId, updatedAt: new Date() })
        .where(eq(architectureProposals.id, proposalId));
    });
  }
}
