import { describe, expect, it } from "vitest";
import { createEmptyArchitectureDocument } from "@axon/diagram-schema";

import {
  TEST_PRICING_CATALOG,
  estimateArchitectureCost,
  estimateArchitectureCostAcrossProviders,
  estimateArchitectureCostAtScale,
  findPricingRecord,
  scaleUsageProfileByFactor,
  validatePricingCatalog,
  type UsageProfile,
} from "./index";

function fixtureDocument() {
  const doc = createEmptyArchitectureDocument({
    id: "doc-cost",
    projectId: "project-cost",
    name: "Cost Fixture",
    now: "2026-07-23T00:00:00.000Z",
  });
  doc.nodes = [
    { id: "api", name: "API", category: "compute", meta: "aws_instance" },
    { id: "db", name: "Database", category: "database", meta: "aws_db_instance" },
    { id: "assets", name: "Assets", category: "storage", meta: "aws_s3_bucket" },
    { id: "jobs", name: "Jobs", category: "queue", meta: "aws_sqs_queue" },
    { id: "external", name: "External API", category: "third-party" },
  ];
  return doc;
}

const usageProfile: UsageProfile = {
  drivers: [
    {
      id: "usage-api-hours",
      componentId: "api",
      unit: "instance-hours",
      value: 730,
      source: "user-supplied",
      timeWindow: "monthly",
      confidence: "high",
      derivation: "One instance for a 730-hour month.",
      userOverride: true,
    },
    {
      id: "usage-db-hours",
      componentId: "db",
      unit: "instance-hours",
      value: 730,
      source: "architecture-assumption",
      timeWindow: "monthly",
      confidence: "medium",
      derivation: "One managed database instance.",
      userOverride: false,
    },
    {
      id: "usage-assets-storage",
      componentId: "assets",
      unit: "gb-month",
      value: 500,
      source: "user-supplied",
      timeWindow: "monthly",
      confidence: "high",
      derivation: "User supplied object storage estimate.",
      userOverride: true,
    },
    {
      id: "usage-job-requests",
      componentId: "jobs",
      unit: "requests-per-month",
      value: 2_000_000,
      source: "scenario-derived",
      timeWindow: "monthly",
      confidence: "medium",
      derivation: "Projected queue operations from request volume.",
      userOverride: false,
    },
  ],
};

describe("architecture cost estimate", () => {
  it("validates the offline deterministic pricing catalog", () => {
    expect(validatePricingCatalog(TEST_PRICING_CATALOG).version).toBe("2026.07.test");
    expect(TEST_PRICING_CATALOG.records.every((record) => record.validationStatus)).toBe(true);
    expect(new Set(TEST_PRICING_CATALOG.records.map((record) => record.provider))).toEqual(
      new Set(["aws", "gcp", "azure"]),
    );
  });

  it("falls back to global pricing records when a regional record is absent", () => {
    expect(
      findPricingRecord(TEST_PRICING_CATALOG, {
        provider: "aws",
        serviceId: "storage",
        region: "us-east-1",
        unit: "gb-month",
      })?.region,
    ).toBe("global");
  });

  it("estimates low, expected, and high monthly architecture costs with itemized records", () => {
    const estimate = estimateArchitectureCost({
      document: fixtureDocument(),
      provider: "aws",
      region: "us-east-1",
      usageProfile,
    });

    expect(estimate.pricingCatalogVersion).toBe("2026.07.test");
    expect(estimate.currency).toBe("USD");
    expect(estimate.expectedMonthly).toBe(179.8);
    expect(estimate.lowMonthly).toBeLessThan(estimate.expectedMonthly);
    expect(estimate.highMonthly).toBeGreaterThan(estimate.expectedMonthly);
    expect(estimate.lineItems).toHaveLength(5);
    expect(estimate.majorCostDrivers[0]).toContain("Database");
    expect(estimate.limitations.join(" ")).toContain("not an invoice");
  });

  it("uses free tiers and never treats unsupported services as free", () => {
    const estimate = estimateArchitectureCost({
      document: fixtureDocument(),
      provider: "aws",
      region: "us-east-1",
      usageProfile,
    });

    const queue = estimate.lineItems.find((item) => item.componentId === "jobs");
    expect(queue?.expectedMonthly).toBe(0.4);

    const unsupported = estimate.lineItems.find((item) => item.componentId === "external");
    expect(unsupported?.missingInputs).toContain("supported cost model");
    expect(unsupported?.limitations.join(" ")).toContain("not treated as free");
  });

  it("reports missing usage assumptions with lower confidence", () => {
    const estimate = estimateArchitectureCost({
      document: fixtureDocument(),
      provider: "aws",
      region: "us-east-1",
      usageProfile: {
        drivers: usageProfile.drivers.filter((driver) => driver.componentId !== "db"),
      },
    });

    const db = estimate.lineItems.find((item) => item.componentId === "db");
    expect(db?.missingInputs).toContain("instance-hours usage");
    expect(estimate.confidence).toBe("low");
  });

  it("projects scale without multiplying fixed instance-hour assumptions", () => {
    const scaled = estimateArchitectureCostAtScale({
      document: fixtureDocument(),
      provider: "aws",
      region: "us-east-1",
      usageProfile,
    });

    expect(scaled[1].expectedMonthly).toBe(179.8);
    expect(scaled[10].expectedMonthly).toBe(290.5);
    expect(scaled[10].expectedMonthly).toBeLessThan(scaled[1].expectedMonthly * 10);
  });

  it("scales arbitrary scenario-derived usage without changing fixed instance hours", () => {
    const scaled = scaleUsageProfileByFactor(usageProfile, 3.5);
    expect(scaled.drivers.find((item) => item.componentId === "api")?.value).toBe(730);
    expect(scaled.drivers.find((item) => item.componentId === "assets")?.value).toBe(1750);
    expect(scaled.drivers.find((item) => item.componentId === "jobs")?.source).toBe(
      "scenario-derived",
    );
  });

  it("compares AWS, GCP, and Azure with provider-specific pricing records", () => {
    const comparison = estimateArchitectureCostAcrossProviders({
      document: fixtureDocument(),
      usageProfile,
    });

    expect(comparison.aws.region).toBe("us-east-1");
    expect(comparison.gcp.region).toBe("us-central1");
    expect(comparison.azure.region).toBe("eastus");
    expect(comparison.aws.expectedMonthly).not.toBe(comparison.gcp.expectedMonthly);
    expect(
      comparison.azure.lineItems.some((item) => item.pricingRecord?.provider === "azure"),
    ).toBe(true);
  });

  it("is deterministic for identical inputs", () => {
    const first = estimateArchitectureCost({
      document: fixtureDocument(),
      provider: "aws",
      region: "us-east-1",
      usageProfile,
    });
    const second = estimateArchitectureCost({
      document: fixtureDocument(),
      provider: "aws",
      region: "us-east-1",
      usageProfile,
    });

    expect(second).toEqual(first);
  });
});
