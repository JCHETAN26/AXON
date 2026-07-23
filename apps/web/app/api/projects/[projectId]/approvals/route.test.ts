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

import { GET, POST } from "./route";
import { PATCH } from "./[approvalId]/route";

let db: Database;

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/projects/project-1/approvals", {
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

beforeAll(async () => {
  process.env.AXON_DB_DRIVER = "pglite";
  db = await getDatabaseAsync();
});

beforeEach(async () => {
  authState.currentUserId = null;
  await resetTestDatabase(db);
});

describe("/api/projects/[projectId]/approvals", () => {
  it("creates, lists, and approves owner-scoped approvals", async () => {
    const userId = await grantBeta("approval-owner@example.com");
    authState.currentUserId = userId;
    const project = await new ServerProjectRepository(db, userId).createProject({
      name: "Approvals",
      template: "sample",
    });

    const createResponse = await POST(
      jsonRequest({
        subjectKind: "architecture",
        subjectId: project.document.id,
        title: "Approve architecture",
        description: "Ready for review.",
      }),
      { params: Promise.resolve({ projectId: project.project.id }) },
    );
    expect(createResponse.status).toBe(201);
    const createPayload = (await createResponse.json()) as {
      approval: { id: string; status: string; title: string };
    };
    expect(createPayload.approval).toMatchObject({
      title: "Approve architecture",
      status: "pending",
    });

    const listResponse = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ projectId: project.project.id }),
    });
    expect(listResponse.status).toBe(200);
    const listPayload = (await listResponse.json()) as { approvals: { id: string }[] };
    expect(listPayload.approvals).toHaveLength(1);

    const approveResponse = await PATCH(jsonRequest({ decision: "approved" }), {
      params: Promise.resolve({
        projectId: project.project.id,
        approvalId: createPayload.approval.id,
      }),
    });
    expect(approveResponse.status).toBe(200);
    await expect(approveResponse.json()).resolves.toMatchObject({
      approval: { status: "approved", decidedByUserId: userId },
    });

    const duplicateResponse = await PATCH(jsonRequest({ decision: "rejected" }), {
      params: Promise.resolve({
        projectId: project.project.id,
        approvalId: createPayload.approval.id,
      }),
    });
    expect(duplicateResponse.status).toBe(409);
  });

  it("does not leak approvals across owners", async () => {
    const alice = await grantBeta("alice-approvals-route@example.com");
    const bob = await grantBeta("bob-approvals-route@example.com");
    const project = await new ServerProjectRepository(db, alice).createProject({
      name: "Private approvals",
      template: "blank",
    });
    authState.currentUserId = bob;

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ projectId: project.project.id }),
    });

    expect(response.status).toBe(404);
  });

  it("rejects invalid approval requests", async () => {
    const userId = await grantBeta("approval-invalid@example.com");
    authState.currentUserId = userId;
    const project = await new ServerProjectRepository(db, userId).createProject({
      name: "Approvals",
      template: "blank",
    });

    const response = await POST(jsonRequest({ subjectKind: "architecture", title: " " }), {
      params: Promise.resolve({ projectId: project.project.id }),
    });

    expect(response.status).toBe(400);
  });
});
