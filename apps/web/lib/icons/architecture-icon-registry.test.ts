import { describe, expect, it } from "vitest";

import {
  ARCHITECTURE_ICON_REGISTRY,
  UNKNOWN_ARCHITECTURE_ICON,
  findArchitectureIconById,
  resolveArchitectureIcon,
  searchArchitectureIcons,
} from "./architecture-icon-registry";

describe("architecture icon registry", () => {
  it("keeps every icon record licensed and display-ready", () => {
    const ids = new Set<string>();
    for (const icon of ARCHITECTURE_ICON_REGISTRY) {
      expect(icon.id).toMatch(/^[a-z0-9.-]+$/);
      expect(ids.has(icon.id)).toBe(false);
      ids.add(icon.id);
      expect(icon.assetPath).toMatch(/^axon-generic:/);
      expect(icon.licenseNote).toContain("not an official provider logo");
      expect(icon.defaultSize).toBeGreaterThan(0);
      expect(icon.viewBox).toBe("0 0 20 20");
      expect(icon.lightDarkSuitability).toBe("both");
    }
    expect(ARCHITECTURE_ICON_REGISTRY.length).toBeGreaterThanOrEqual(30);
  });

  it("resolves known provider services by metadata alias", () => {
    expect(resolveArchitectureIcon({ category: "compute", meta: "aws_instance" }).id).toBe(
      "aws.ec2",
    );
    expect(
      resolveArchitectureIcon({ category: "database", meta: "google_sql_database_instance" }).id,
    ).toBe("gcp.cloud-sql");
    expect(
      resolveArchitectureIcon({ category: "queue", meta: "azurerm_servicebus_queue" }).id,
    ).toBe("azure.service-bus");
  });

  it("finds explicit icon ids without falling back", () => {
    expect(findArchitectureIconById("azure.service-bus")?.service).toBe("Azure Service Bus");
    expect(findArchitectureIconById("missing.icon")).toBeNull();
    expect(findArchitectureIconById(undefined)).toBeNull();
  });

  it("does not treat broad product terms as provider proof", () => {
    expect(resolveArchitectureIcon({ name: "app-service", category: "Compute" }).id).toBe(
      "generic.compute",
    );
    expect(resolveArchitectureIcon({ name: "postgresql", category: "Database" }).id).toBe(
      "aws.rds",
    );
  });

  it("searches aliases and terms without guessing an unrelated provider", () => {
    expect(searchArchitectureIcons("postgres").map((icon) => icon.id)).toEqual(
      expect.arrayContaining(["aws.rds", "gcp.cloud-sql"]),
    );
    expect(searchArchitectureIcons("kubernetes").map((icon) => icon.id)).toEqual(
      expect.arrayContaining(["aws.eks", "gcp.gke", "azure.aks", "kubernetes.workload"]),
    );
    expect(resolveArchitectureIcon({ name: "mystery appliance", category: "custom" })).toBe(
      UNKNOWN_ARCHITECTURE_ICON,
    );
  });
});
