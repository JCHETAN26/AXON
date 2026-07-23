import { type ArchitectureDocument } from "@axon/diagram-schema";
import { type ArchitectureProposal, type ProposalComponent, type ProposalRelationship } from "../schemas";
import { getAwsToGcpMapping } from "./aws-to-gcp-catalog";

export interface AwsToGcpMigrationResult {
  targetProposal: ArchitectureProposal;
  mappedComponentsCount: number;
  unmappedComponentsCount: number;
  averageEquivalenceScore: number;
  residualRisks: string[];
}

export function transformAwsToGcp(document: ArchitectureDocument): AwsToGcpMigrationResult {
  const targetComponents: ProposalComponent[] = [];
  const residualRisks: string[] = [];
  let totalEquivalence = 0;
  let mappedCount = 0;
  let unmappedCount = 0;

  for (const node of document.nodes) {
    const awsTech = node.meta ?? node.category;
    const mapping = getAwsToGcpMapping(awsTech);

    if (mapping) {
      mappedCount++;
      totalEquivalence += mapping.equivalenceScore;

      targetComponents.push({
        id: `gcp-${node.id}`,
        name: `${node.name} (${mapping.gcpProductName})`,
        category: mapping.gcpCategory,
        technology: mapping.gcpTechnology,
        confidence: mapping.equivalenceScore >= 0.9 ? "high" : "medium",
        evidenceIds: ["migration-transform"],
        review: "proposed",
      });

      if (mapping.refactoringNotes) {
        residualRisks.push(`${node.name}: ${mapping.refactoringNotes}`);
      }
    } else {
      unmappedCount++;
      totalEquivalence += 0.5;

      targetComponents.push({
        id: `gcp-${node.id}`,
        name: `${node.name} (GCP Custom Resource)`,
        category: node.category,
        technology: `gcp_${node.category}`,
        confidence: "medium",
        evidenceIds: ["migration-transform"],
        review: "proposed",
      });

      residualRisks.push(`${node.name}: Uncataloged AWS service requires manual architectural mapping.`);
    }
  }

  const targetRelationships: ProposalRelationship[] = document.edges.map((e) => ({
    id: `gcp-rel-${e.id}`,
    source: `gcp-${e.source}`,
    target: `gcp-${e.target}`,
    kind: e.kind,
    confidence: "high",
    evidenceIds: ["migration-transform"],
    review: "proposed",
  }));

  const totalComponents = document.nodes.length;
  const averageEquivalenceScore = totalComponents > 0 ? totalEquivalence / totalComponents : 1.0;

  const targetProposal: ArchitectureProposal = {
    schemaVersion: "1.0",
    sourceRepositoryFullName: document.source.label ?? "AWS Source Architecture",
    sourceCommitSha: "gcp-target-migration",
    components: targetComponents,
    relationships: targetRelationships,
    conflicts: [],
    unresolved: residualRisks,
    createdAt: new Date().toISOString(),
  };

  return {
    targetProposal,
    mappedComponentsCount: mappedCount,
    unmappedComponentsCount: unmappedCount,
    averageEquivalenceScore,
    residualRisks,
  };
}
