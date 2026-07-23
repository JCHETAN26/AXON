// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { type UsageDriver } from "@axon/architecture-cost";

import { createInvite, redeemInvite } from "@/lib/server/beta";
import { CostService } from "@/lib/server/cost/cost-service";
import { getDatabaseAsync, type Database } from "@/lib/server/db/client";
import { resetTestDatabase } from "@/lib/server/db/testing";
import { ServerProjectRepository } from "@/lib/server/repositories/server-project-repository";
import { seedUser } from "@/lib/server/test-support/seed";

const authState = vi.hoisted(() => ({ currentUserId: null as string | null }));

vi.mock("@/lib/server/current-user", () => ({
  getCurrentUser: () =>
    Promise.resolve(authState.currentUserId === null ? null : { id: authState.currentUserId }),
}));

import { GET } from "./route";

let db: Database;

async function grantBeta(email: string): Promise<string> {
  const userId = await seedUser(db, email);
  await createInvite(db, `INV-${email}`);
  await redeemInvite(db, userId, `INV-${email}`);
  return userId;
}

function driver(componentId: string): UsageDriver {
  return {
    id: `usage-${componentId}-hours`,
    componentId,
    unit: "instance-hours",
    value: 730,
    source: "user-supplied",
    timeWindow: "monthly",
    confidence: "high",
    derivation: `User supplied monthly hours for ${componentId}.`,
    userOverride: true,
  };
}

beforeAll(async () => {
  process.env.AXON_DB_DRIVER = "pglite";
  db = await getDatabaseAsync();
});

beforeEach(async () => {
  authState.currentUserId = null;
  await resetTestDatabase(db);
});

describe("GET /api/projects/[projectId]/cost/estimates", () => {
  it("lists the authenticated owner's persisted estimate history", async () => {
    const userId = await grantBeta("cost-history@example.com");
    authState.currentUserId = userId;
    const project = await new ServerProjectRepository(db, userId).createProject({
      name: "Cost history",
      template: "sample",
    });
    await new CostService(db, userId).createEstimateRun({
      projectId: project.project.id,
      provider: "aws",
      region: "us-east-1",
      usageDrivers: [driver("app"), driver("postgres")],
    });

    const response = await GET(new Request("http://localhost/api/projects/p/cost/estimates"), {
      params: Promise.resolve({ projectId: project.project.id }),
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      estimates: { provider: string; pricingCatalogVersion: string; expectedMonthly: number }[];
    };
    expect(payload.estimates).toHaveLength(1);
    expect(payload.estimates[0]?.provider).toBe("aws");
    expect(payload.estimates[0]?.pricingCatalogVersion).toBe("2026.07.test");
    expect(payload.estimates[0]?.expectedMonthly).toBeGreaterThan(0);
  });

  it("returns no history for a foreign project id", async () => {
    const alice = await grantBeta("alice-history@example.com");
    const bob = await grantBeta("bob-history@example.com");
    const project = await new ServerProjectRepository(db, alice).createProject({
      name: "Private history",
      template: "sample",
    });
    await new CostService(db, alice).createEstimateRun({
      projectId: project.project.id,
      provider: "aws",
      region: "us-east-1",
      usageDrivers: [driver("app")],
    });
    authState.currentUserId = bob;

    const response = await GET(new Request("http://localhost/api/projects/p/cost/estimates"), {
      params: Promise.resolve({ projectId: project.project.id }),
    });
    const payload = (await response.json()) as { estimates: unknown[] };

    expect(response.status).toBe(200);
    expect(payload.estimates).toEqual([]);
  });
});
