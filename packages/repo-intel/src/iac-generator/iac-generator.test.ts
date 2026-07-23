import { describe, it, expect } from "vitest";
import { generateInfrastructureCode } from "./iac-generator";
import { type ArchitectureProposal } from "../schemas";

describe("iac-generator", () => {
  it("generates Terraform HCL and Kubernetes YAML from an ArchitectureProposal", () => {
    const proposal: ArchitectureProposal = {
      schemaVersion: "1.0",
      sourceRepositoryFullName: "org/app",
      sourceCommitSha: "prop-123",
      components: [
        {
          id: "comp-web",
          name: "Web API",
          category: "compute",
          technology: "aws_instance",
          confidence: "high",
          evidenceIds: ["ev-1"],
          review: "accepted",
        },
        {
          id: "comp-db",
          name: "Postgres DB",
          category: "database",
          technology: "aws_db_instance",
          confidence: "high",
          evidenceIds: ["ev-2"],
          review: "accepted",
        },
      ],
      relationships: [],
      conflicts: [],
      unresolved: [],
      createdAt: "2026-04-01T00:00:00Z",
    };

    const result = generateInfrastructureCode(proposal);

    expect(result.terraformHcl).toContain('resource "aws_instance" "comp_web"');
    expect(result.terraformHcl).toContain('resource "aws_db_instance" "comp_db"');
    expect(result.kubernetesYaml).toContain("kind: Deployment");
    expect(result.kubernetesYaml).toContain("name: web-api");
    expect(result.files).toHaveLength(2);
  });
});
