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
import { PATCH } from "./[commentId]/route";

let db: Database;

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/projects/project-1/comments", {
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

describe("/api/projects/[projectId]/comments", () => {
  it("creates, lists, and resolves owner-scoped comments", async () => {
    const userId = await grantBeta("comment-owner@example.com");
    authState.currentUserId = userId;
    const project = await new ServerProjectRepository(db, userId).createProject({
      name: "Commented",
      template: "sample",
    });

    const createResponse = await POST(
      jsonRequest({
        body: "Check the gateway timeout.",
        anchorKind: "node",
        anchorId: "gateway",
      }),
      { params: Promise.resolve({ projectId: project.project.id }) },
    );
    expect(createResponse.status).toBe(201);
    const createPayload = (await createResponse.json()) as {
      comment: { id: string; body: string; anchorKind: string };
    };
    expect(createPayload.comment).toMatchObject({
      body: "Check the gateway timeout.",
      anchorKind: "node",
    });

    const listResponse = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ projectId: project.project.id }),
    });
    expect(listResponse.status).toBe(200);
    const listPayload = (await listResponse.json()) as { comments: { id: string }[] };
    expect(listPayload.comments).toHaveLength(1);

    const resolveResponse = await PATCH(new Request("http://localhost"), {
      params: Promise.resolve({
        projectId: project.project.id,
        commentId: createPayload.comment.id,
      }),
    });
    expect(resolveResponse.status).toBe(200);
    await expect(resolveResponse.json()).resolves.toEqual({ resolved: true });
  });

  it("does not leak comments across owners", async () => {
    const alice = await grantBeta("alice-comments-route@example.com");
    const bob = await grantBeta("bob-comments-route@example.com");
    const project = await new ServerProjectRepository(db, alice).createProject({
      name: "Private comments",
      template: "blank",
    });
    authState.currentUserId = bob;

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ projectId: project.project.id }),
    });

    expect(response.status).toBe(404);
  });

  it("rejects invalid comment bodies", async () => {
    const userId = await grantBeta("comment-invalid@example.com");
    authState.currentUserId = userId;
    const project = await new ServerProjectRepository(db, userId).createProject({
      name: "Commented",
      template: "blank",
    });

    const response = await POST(jsonRequest({ body: " " }), {
      params: Promise.resolve({ projectId: project.project.id }),
    });

    expect(response.status).toBe(400);
  });
});
