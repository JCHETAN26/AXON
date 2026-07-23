// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createInvite, redeemInvite } from "@/lib/server/beta";
import { getDatabaseAsync, type Database } from "@/lib/server/db/client";
import { resetTestDatabase } from "@/lib/server/db/testing";
import { ServerProjectRepository } from "@/lib/server/repositories/server-project-repository";
import { seedUser } from "@/lib/server/test-support/seed";

const authState = vi.hoisted(() => ({ currentUserId: null as string | null }));

vi.mock("@/lib/server/current-user", () => ({
  getCurrentUser: () =>
    Promise.resolve(authState.currentUserId === null ? null : { id: authState.currentUserId }),
}));

import { POST } from "./route";

let db: Database;

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/projects/project-1/cost/estimate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function grantBeta(email: string): Promise<string> {
  const userId = await seedUser(db, email);
  await createInvite(db, `INV-${email}`);
  await redeemInvite(db, userId, `INV-${email}`);
  return userId;
}

function monthlyDriver(componentId: string, unit: "gb-egress" | "gb-month" | "instance-hours") {
  return {
    id: `usage-${componentId}-${unit}`,
    componentId,
    unit,
    value: unit === "gb-month" ? 500 : 730,
    source: "user-supplied",
    timeWindow: "monthly",
    confidence: "high",
    derivation: `Test estimate for ${componentId}.`,
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

describe("POST /api/projects/[projectId]/cost/estimate", () => {
  it("returns a deterministic owner-scoped estimate for a project document", async () => {
    const userId = await grantBeta("cost-owner@example.com");
    authState.currentUserId = userId;

    const project = await new ServerProjectRepository(db, userId).createProject({
      name: "Costed SaaS",
      template: "sample",
    });

    const response = await POST(
      jsonRequest({
        provider: "aws",
        region: "us-east-1",
        usageDrivers: [
          monthlyDriver("cdn", "gb-egress"),
          monthlyDriver("app", "instance-hours"),
          monthlyDriver("postgres", "instance-hours"),
          monthlyDriver("storage", "gb-month"),
        ],
      }),
      { params: Promise.resolve({ projectId: project.project.id }) },
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      baseline: { expectedMonthly: number; pricingCatalogVersion: string; lineItems: unknown[] };
      scaleProjections: Record<string, { expectedMonthly: number }>;
    };
    expect(payload.baseline.pricingCatalogVersion).toBe("2026.07.test");
    expect(payload.baseline.expectedMonthly).toBeGreaterThan(0);
    expect(payload.baseline.lineItems.length).toBe(project.document.nodes.length);
    const tenX = payload.scaleProjections["10"];
    expect(tenX).toBeDefined();
    expect(tenX?.expectedMonthly).toBeGreaterThan(payload.baseline.expectedMonthly);
  });

  it("does not leak a project owned by another beta user", async () => {
    const alice = await grantBeta("alice-cost@example.com");
    const bob = await grantBeta("bob-cost@example.com");
    const project = await new ServerProjectRepository(db, alice).createProject({
      name: "Private costs",
      template: "sample",
    });
    authState.currentUserId = bob;

    const response = await POST(
      jsonRequest({ usageDrivers: [monthlyDriver("app", "instance-hours")] }),
      { params: Promise.resolve({ projectId: project.project.id }) },
    );

    expect(response.status).toBe(404);
  });

  it("rejects invalid usage drivers before estimating", async () => {
    const userId = await grantBeta("cost-invalid@example.com");
    authState.currentUserId = userId;

    const project = await new ServerProjectRepository(db, userId).createProject({
      name: "Invalid",
      template: "blank",
    });
    const response = await POST(jsonRequest({ usageDrivers: [{ componentId: "app" }] }), {
      params: Promise.resolve({ projectId: project.project.id }),
    });

    expect(response.status).toBe(400);
  });
});
