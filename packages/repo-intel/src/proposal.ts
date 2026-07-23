import { randomUUID } from "crypto";
import {
  type RepositoryEvidence,
  type ArchitectureProposal,
  type ProposalComponent,
  type ProposalRelationship,
  REPO_INTEL_SCHEMA_VERSION,
  type Confidence
} from "./schemas";

function generateId(): string {
  return randomUUID();
}

/**
 * Builds a deterministic ArchitectureProposal from a set of evidence records.
 * Reconciles duplicate evidence into shared components.
 */
export function buildProposal(
  sourceRepositoryFullName: string,
  sourceCommitSha: string,
  evidenceList: RepositoryEvidence[]
): ArchitectureProposal {
  
  // Group evidence by technology/name to merge into components
  const componentGroups = new Map<string, RepositoryEvidence[]>();
  
  for (const evidence of evidenceList) {
    const tech = evidence.fact.technology || evidence.fact.name || "Unknown";
    const category = evidence.fact.category || "unknown";
    const key = `${tech}|${category}`;
    
    let group = componentGroups.get(key);
    if (!group) {
      group = [];
      componentGroups.set(key, group);
    }
    group.push(evidence);
  }

  const components: ProposalComponent[] = [];
  
  // Merge each group into a single component
  for (const [key, groupEvidence] of componentGroups.entries()) {
    const [tech, category] = key.split("|");
    
    // Determine highest confidence in the group
    let maxConfidence: Confidence = "unresolved";
    const confidenceRank: Record<Confidence, number> = {
      unresolved: 0,
      low: 1,
      medium: 2,
      high: 3,
      confirmed: 4
    };
    
    for (const e of groupEvidence) {
      if (confidenceRank[e.confidence] > confidenceRank[maxConfidence]) {
        maxConfidence = e.confidence;
      }
    }
    
    const evidenceIds = groupEvidence.map(e => e.id);
    
    components.push({
      id: generateId(),
      name: tech || "Unknown Component",
      technology: tech === "Unknown" ? undefined : tech,
      category: category || "service",
      confidence: maxConfidence,
      evidenceIds,
      review: "proposed"
    });
  }

  // We are not inferring relationships deterministically without strong evidence
  // that specifies source and target (e.g., explicit compose depends_on could be added later).
  const relationships: ProposalRelationship[] = [];

  return {
    schemaVersion: REPO_INTEL_SCHEMA_VERSION,
    sourceRepositoryFullName,
    sourceCommitSha,
    components,
    relationships,
    conflicts: [],
    unresolved: [],
    createdAt: new Date().toISOString()
  };
}
