import { describe, it, expect } from "vitest";
import { reconcileCrossSourceEvidence } from "./reconciliation";
import { type RepositoryEvidence } from "./schemas";

describe("reconcileCrossSourceEvidence", () => {
  it("creates confirmed-match candidate when single IaC declaration matches app evidence", () => {
    const evidenceList: RepositoryEvidence[] = [
      {
        id: "ev-app",
        filePath: "package.json",
        evidenceType: "dependency",
        extractor: "package-json",
        fact: { name: "pg", technology: "PostgreSQL", category: "database" },
        confidence: "medium",
      },
      {
        id: "ev-tf",
        filePath: "main.tf",
        evidenceType: "infrastructure-declaration",
        extractor: "terraform",
        fact: { name: "db", technology: "PostgreSQL", category: "database", provider: "aws" },
        confidence: "high",
      },
    ];

    const result = reconcileCrossSourceEvidence(evidenceList);

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.matchCategory).toBe("confirmed-match");
    expect(result.conflicts).toHaveLength(0);
  });

  it("detects technology conflict when App and IaC mismatch database technologies", () => {
    const evidenceList: RepositoryEvidence[] = [
      {
        id: "ev-app",
        filePath: "package.json",
        evidenceType: "dependency",
        extractor: "package-json",
        fact: { name: "pg", technology: "PostgreSQL", category: "database" },
        confidence: "medium",
      },
      {
        id: "ev-tf",
        filePath: "main.tf",
        evidenceType: "infrastructure-declaration",
        extractor: "terraform",
        fact: { name: "mysql_db", technology: "MySQL", category: "database", provider: "aws" },
        confidence: "high",
      },
    ];

    const result = reconcileCrossSourceEvidence(evidenceList);

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.description).toContain("Technology mismatch");
  });
});
