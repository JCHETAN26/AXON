import { createEmptyArchitectureDocument } from "@axon/diagram-schema";
import { describe, expect, it } from "vitest";

import { MULTICLOUD_CATALOG_VERSION, findCloudCapability } from "./capability-catalog";
import { planMultiCloudMigration, type MultiCloudMappingType } from "./multicloud-planner";

function fixture(technology = "aws_instance", category = "compute") {
  const doc = createEmptyArchitectureDocument({
    id: "doc-mc",
    projectId: "project-mc",
    name: "Multi-cloud",
    now: "2026-07-23T00:00:00.000Z",
  });
  doc.nodes = [{ id: "app", name: "App", category, meta: technology }];
  return doc;
}

describe("multi-cloud capability catalog", () => {
  it("finds Azure service support from curated aliases", () => {
    expect(
      findCloudCapability({
        provider: "azure",
        technology: "azurerm_postgresql_flexible_server",
      })?.displayName,
    ).toBe("Azure Database for PostgreSQL");
  });
});

describe("planMultiCloudMigration", () => {
  it.each([
    ["aws", "gcp"],
    ["aws", "azure"],
    ["gcp", "aws"],
    ["gcp", "azure"],
    ["azure", "aws"],
    ["azure", "gcp"],
  ] as const)("plans %s to %s mappings", (sourceProvider, targetProvider) => {
    const technology =
      sourceProvider === "aws"
        ? "aws_instance"
        : sourceProvider === "gcp"
          ? "google_compute_instance"
          : "azurerm_linux_virtual_machine";
    const plan = planMultiCloudMigration({
      document: fixture(technology),
      sourceProvider,
      targetProvider,
    });
    expect(plan.catalogVersion).toBe(MULTICLOUD_CATALOG_VERSION);
    expect(plan.mappings[0]?.mappingType).toBe("strong-equivalent");
    expect(plan.mappings[0]?.selectedTarget?.provider).toBe(targetProvider);
  });

  it.each([
    ["aws_sqs_queue", "partial-equivalent"],
    ["unknown_appliance", "unsupported"],
  ] as const)("classifies %s as %s", (technology, mappingType: MultiCloudMappingType) => {
    const plan = planMultiCloudMigration({
      document: fixture(technology, technology === "aws_sqs_queue" ? "queue" : "custom"),
      sourceProvider: "aws",
      targetProvider: "gcp",
    });
    expect(plan.mappings[0]?.mappingType).toBe(mappingType);
    expect(plan.mappings[0]?.unresolvedDecisions.length).toBeGreaterThan(0);
  });

  it("warns instead of recommending multi-cloud automatically for neutral adoption", () => {
    const plan = planMultiCloudMigration({
      document: fixture("service", "compute"),
      sourceProvider: "neutral",
      targetProvider: "aws",
    });
    expect(plan.warnings.join(" ")).toContain("Cloud-neutral mappings require human confirmation");
    expect(plan.assumptions.join(" ")).toContain("no live cloud inventory");
  });
});
