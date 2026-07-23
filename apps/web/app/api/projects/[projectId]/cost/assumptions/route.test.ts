// @vitest-environment node
import { type UsageDriver } from "@axon/architecture-cost";
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

import { GET, PUT } from "./route";

let db: Database;

async function grantBeta(email: string): Promise<string> {
  const userId = await seedUser(db, email);
  await createInvite(db, `INV-${email}`);
  await redeemInvite(db, userId, `INV-${email}`);
  return userId;
}

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/projects/project-1/cost/assumptions", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function monthlyDriver(componentId: string): UsageDriver {
  return {
    id: `usage-${componentId}-hours`,
    componentId,
    unit: "instance-hours",
    value: 1460,
    source: "user-supplied",
    timeWindow: "monthly",
    confidence: "medium",
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

describe("/api/projects/[projectId]/cost/assumptions", () => {
  it("saves and lists owner-scoped usage assumptions", async () => {
    const userId = await grantBeta("cost-assumptions@example.com");
    authState.currentUserId = userId;
    const project = await new ServerProjectRepository(db, userId).createProject({
      name: "Editable costs",
      template: "sample",
    });

    const putResponse = await PUT(
      jsonRequest({ usageDrivers: [monthlyDriver("app")] }),
      { params: Promise.resolve({ projectId: project.project.id }) },
    );
    expect(putResponse.status).toBe(200);

    const getResponse = await GET(
      new Request("http://localhost/api/projects/project-1/cost/assumptions"),
      { params: Promise.resolve({ projectId: project.project.id }) },
    );
    const payload = (await getResponse.json()) as { usageDrivers: UsageDriver[] };

    expect(getResponse.status).toBe(200);
    expect(payload.usageDrivers).toHaveLength(1);
    expect(payload.usageDrivers[0]?.componentId).toBe("app");
    expect(payload.usageDrivers[0]?.value).toBe(1460);
  });

  it("does not expose assumptions for a foreign project", async () => {
    const alice = await grantBeta("alice-assumptions@example.com");
    const bob = await grantBeta("bob-assumptions@example.com");
    const project = await new ServerProjectRepository(db, alice).createProject({
      name: "Private cost assumptions",
      template: "sample",
    });
    authState.currentUserId = bob;

    const getResponse = await GET(
      new Request("http://localhost/api/projects/project-1/cost/assumptions"),
      { params: Promise.resolve({ projectId: project.project.id }) },
    );
    const payload = (await getResponse.json()) as { usageDrivers: UsageDriver[] };

    expect(getResponse.status).toBe(200);
    expect(payload.usageDrivers).toEqual([]);
  });

  it("rejects invalid assumption payloads", async () => {
    const userId = await grantBeta("invalid-assumptions@example.com");
    authState.currentUserId = userId;
    const project = await new ServerProjectRepository(db, userId).createProject({
      name: "Invalid costs",
      template: "sample",
    });

    const response = await PUT(jsonRequest({ usageDrivers: [{ componentId: "app" }] }), {
      params: Promise.resolve({ projectId: project.project.id }),
    });

    expect(response.status).toBe(400);
  });
});
