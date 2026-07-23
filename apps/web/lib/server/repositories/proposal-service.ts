import { and, eq } from "drizzle-orm";
import { type Database } from "../db/client";
import { architectureProposals, documents } from "../db/schema";
import { type ArchitectureProposal } from "@axon/repo-intel";
import { type ArchitectureDocument } from "@axon/diagram-schema";

export class ProposalService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string
  ) {}

  async applyProposal(
    proposalId: string,
    projectId: string
  ): Promise<void> {
    const pRows = await this.db.select().from(architectureProposals).where(
      and(
        eq(architectureProposals.id, proposalId),
        eq(architectureProposals.ownerId, this.ownerId)
      )
    ).limit(1);

    const proposalRow = pRows[0];
    if (!proposalRow) throw new Error("Proposal not found");
    if (proposalRow.status === "applied") throw new Error("Proposal already applied");

    const proposal = proposalRow.proposal as unknown as ArchitectureProposal;
    
    // Get current document
    const dRows = await this.db.select().from(documents).where(
      and(
        eq(documents.projectId, projectId),
        eq(documents.ownerId, this.ownerId)
      )
    ).limit(1);

    let doc: ArchitectureDocument;
    let version = 1;

    if (dRows[0]) {
      doc = dRows[0].document as unknown as ArchitectureDocument;
      version = dRows[0].version + 1;
    } else {
      doc = {
        schemaVersion: "1.0",
        id: "doc-1",
        projectId: projectId,
        name: "Initial Architecture",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: { kind: "generated" },
        assumptions: [],
        nodes: [],
        edges: [],
        groups: [],
        metadata: { generator: "axon-web" },
      };
    }

    // Process accepted components
    const acceptedComponents = proposal.components.filter(c => c.review === "accepted");
    for (const c of acceptedComponents) {
      // Very naive merge for now: just add if it doesn't exist
      const exists = doc.nodes.find((existing: { id: string }) => existing.id === c.id);
      if (!exists) {
        doc.nodes.push({
          id: c.id,
          name: c.name,
          category: c.category,
          meta: c.technology,
        });
      }
    }

    // Transaction to update
    await this.db.transaction(async (tx) => {
      if (dRows[0]) {
        await tx.update(documents)
          .set({ document: doc, version, updatedAt: new Date() })
          .where(and(eq(documents.projectId, projectId), eq(documents.version, dRows[0].version)));
      } else {
        await tx.insert(documents).values({
          projectId,
          ownerId: this.ownerId,
          document: doc,
          version: 1
        });
      }

      await tx.update(architectureProposals)
        .set({ status: "applied", projectId, updatedAt: new Date() })
        .where(eq(architectureProposals.id, proposalId));
    });
  }
}
