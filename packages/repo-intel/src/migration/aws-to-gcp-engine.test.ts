import { describe, it, expect } from "vitest";
import { transformAwsToGcp } from "./aws-to-gcp-engine";
import { createEmptyArchitectureDocument } from "@axon/diagram-schema";

describe("aws-to-gcp-engine", () => {
  it("transforms AWS EC2, RDS, and S3 components to Google Compute Engine, Cloud SQL, and Cloud Storage", () => {
    const doc = createEmptyArchitectureDocument({
      id: "doc-aws",
      name: "AWS App",
      projectId: "proj-1",
      now: "2026-04-01T00:00:00Z",
    });

    doc.nodes = [
      { id: "n1", name: "Web Server", category: "compute", meta: "aws_instance" },
      { id: "n2", name: "Postgres DB", category: "database", meta: "aws_db_instance" },
      { id: "n3", name: "Media Assets", category: "storage", meta: "aws_s3_bucket" },
    ];

    doc.edges = [
      { id: "e1", source: "n1", target: "n2", kind: "sync" },
      { id: "e2", source: "n1", target: "n3", kind: "data" },
    ];

    const result = transformAwsToGcp(doc);

    expect(result.mappedComponentsCount).toBe(3);
    expect(result.unmappedComponentsCount).toBe(0);
    expect(result.averageEquivalenceScore).toBe(1.0);

    const comp1 = result.targetProposal.components.find((c) => c.id === "gcp-n1");
    expect(comp1?.technology).toBe("google_compute_instance");

    const comp2 = result.targetProposal.components.find((c) => c.id === "gcp-n2");
    expect(comp2?.technology).toBe("google_sql_database_instance");

    const comp3 = result.targetProposal.components.find((c) => c.id === "gcp-n3");
    expect(comp3?.technology).toBe("google_storage_bucket");

    expect(result.targetProposal.relationships).toHaveLength(2);
  });
});
