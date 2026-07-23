import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { type UsageDriver } from "@axon/architecture-cost";

import { type Database } from "../db/client";
import { createTestDatabase, resetTestDatabase } from "../db/testing";
import { ServerProjectRepository } from "../repositories/server-project-repository";
import { seedUser } from "../test-support/seed";
import { CostService } from "./cost-service";

let db: Database;
let alice: string;
let bob: string;

beforeAll(async () => {
  db = await createTestDatabase();
});

beforeEach(async () => {
  await resetTestDatabase(db);
  alice = await seedUser(db, "alice-cost-service@example.com");
  bob = await seedUser(db, "bob-cost-service@example.com");
});

function serviceFor(ownerId: string) {
  return new CostService(db, ownerId);
}

function driver(componentId: string, value: number): UsageDriver {
  return {
    id: `usage-${componentId}-hours`,
    componentId,
    unit: "instance-hours",
    value,
    source: "user-supplied",
    timeWindow: "monthly",
    confidence: "high",
    derivation: `User supplied monthly hours for ${componentId}.`,
    userOverride: true,
  };
}

describe("CostService", () => {
  it("upserts normalized usage assumptions for an owned project", async () => {
    const project = await new ServerProjectRepository(db, alice).createProject({
      name: "Cost assumptions",
      template: "sample",
    });

    await serviceFor(alice).upsertUsageAssumptions(project.project.id, [driver("app", 730)]);
    await serviceFor(alice).upsertUsageAssumptions(project.project.id, [driver("app", 365)]);

    const assumptions = await serviceFor(alice).listUsageAssumptions(project.project.id);
    expect(assumptions).toHaveLength(1);
    expect(assumptions[0]?.componentId).toBe("app");
    expect(assumptions[0]?.value).toBe(365);
  });

  it("persists estimate runs with pricing version and scale projections", async () => {
    const project = await new ServerProjectRepository(db, alice).createProject({
      name: "Cost run",
      template: "sample",
    });

    const result = await serviceFor(alice).createEstimateRun({
      projectId: project.project.id,
      provider: "aws",
      region: "us-east-1",
      usageDrivers: [driver("app", 730), driver("postgres", 730)],
      includeScaleProjections: true,
    });

    expect(result?.runId).toBeTruthy();
    expect(result?.baseline.pricingCatalogVersion).toBe("2026.07.test");
    expect(result?.baseline.expectedMonthly).toBeGreaterThan(0);
    expect(result?.scaleProjections?.[10].expectedMonthly).toBeGreaterThan(0);

    const history = await serviceFor(alice).listEstimateRuns(project.project.id);
    expect(history).toHaveLength(1);
    expect(history[0]?.pricingCatalogVersion).toBe("2026.07.test");
    expect(history[0]?.expectedMonthly).toBe(result?.baseline.expectedMonthly);
  });

  it("can create a preview estimate without saving submitted assumptions", async () => {
    const project = await new ServerProjectRepository(db, alice).createProject({
      name: "Cost preview",
      template: "sample",
    });

    const result = await serviceFor(alice).createEstimateRun({
      projectId: project.project.id,
      provider: "aws",
      region: "us-east-1",
      usageDrivers: [driver("app", 730)],
      persistUsageAssumptions: false,
    });

    expect(result?.baseline.expectedMonthly).toBeGreaterThan(0);
    expect(await serviceFor(alice).listUsageAssumptions(project.project.id)).toEqual([]);
    expect(await serviceFor(alice).listEstimateRuns(project.project.id)).toHaveLength(1);
  });

  it("treats another user's project as not found", async () => {
    const project = await new ServerProjectRepository(db, alice).createProject({
      name: "Private cost run",
      template: "sample",
    });

    await expect(
      serviceFor(bob).upsertUsageAssumptions(project.project.id, [driver("app", 730)]),
    ).rejects.toThrow(/project not found/i);
    expect(
      await serviceFor(bob).createEstimateRun({
        projectId: project.project.id,
        provider: "aws",
        region: "us-east-1",
        usageDrivers: [driver("app", 730)],
      }),
    ).toBeNull();
    expect(await serviceFor(bob).listEstimateRuns(project.project.id)).toEqual([]);
  });
});
