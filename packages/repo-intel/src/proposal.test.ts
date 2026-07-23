import { describe, it, expect } from "vitest";
import { buildProposal } from "./proposal";
import { type RepositoryEvidence } from "./schemas";

describe("buildProposal", () => {
  it("groups and deduplicates evidence into a deterministic proposal", () => {
    const evidenceList: RepositoryEvidence[] = [
      {
        id: "ev1",
        filePath: "package.json",
        evidenceType: "dependency",
        extractor: "package-json",
        fact: { name: "pg", technology: "PostgreSQL", category: "database" },
        confidence: "medium",
      },
      {
        id: "ev2",
        filePath: "docker-compose.yml",
        evidenceType: "container-service",
        extractor: "compose",
        fact: { name: "postgres:15", technology: "PostgreSQL", category: "database" },
        confidence: "confirmed",
      }
    ];

    const proposal = buildProposal("org/repo", "sha", evidenceList);

    expect(proposal.components).toHaveLength(1);
    
    const pgComponent = proposal.components[0];
    expect(pgComponent).toBeDefined();
    if (!pgComponent) return;
    expect(pgComponent.technology).toBe("PostgreSQL");
    expect(pgComponent.category).toBe("database");
    
    // Confidence is elevated to the maximum
    expect(pgComponent.confidence).toBe("confirmed");
    
    // Both evidences are cited
    expect(pgComponent.evidenceIds).toContain("ev1");
    expect(pgComponent.evidenceIds).toContain("ev2");
  });
});
