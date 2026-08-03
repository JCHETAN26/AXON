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
import { DELETE } from "./[shareLinkId]/route";

let db: Database;

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/projects/project-1/share-links", {
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

describe("/api/projects/[projectId]/share-links", () => {
  it("creates, lists, and revokes owner-scoped share links", async () => {
    const userId = await grantBeta("share-owner@example.com");
    authState.currentUserId = userId;
    const project = await new ServerProjectRepository(db, userId).createProject({
      name: "Shared",
      template: "sample",
    });

    const createResponse = await POST(
      jsonRequest({
        role: "viewer",
        label: "Design review",
        // Relative to now: the route rejects an already-elapsed expiry, so a
        // hard-coded date turns this into a time bomb.
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
      { params: Promise.resolve({ projectId: project.project.id }) },
    );
    expect(createResponse.status).toBe(201);
    const createPayload = (await createResponse.json()) as {
      shareLink: { id: string; rawToken: string; role: string; label: string };
    };
    expect(createPayload.shareLink.rawToken).toHaveLength(43);
    expect(createPayload.shareLink.role).toBe("viewer");

    const listResponse = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ projectId: project.project.id }),
    });
    expect(listResponse.status).toBe(200);
    const listPayload = (await listResponse.json()) as {
      shareLinks: { id: string; rawToken?: string; label: string }[];
    };
    expect(listPayload.shareLinks).toHaveLength(1);
    expect(listPayload.shareLinks[0]?.rawToken).toBeUndefined();
    expect(listPayload.shareLinks[0]?.label).toBe("Design review");

    const deleteResponse = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({
        projectId: project.project.id,
        shareLinkId: createPayload.shareLink.id,
      }),
    });
    expect(deleteResponse.status).toBe(200);
    await expect(deleteResponse.json()).resolves.toEqual({ revoked: true });
  });

  it("does not leak another owner's project through share-link routes", async () => {
    const alice = await grantBeta("alice-share@example.com");
    const bob = await grantBeta("bob-share@example.com");
    const project = await new ServerProjectRepository(db, alice).createProject({
      name: "Private",
      template: "blank",
    });
    authState.currentUserId = bob;

    const response = await POST(jsonRequest({ role: "viewer" }), {
      params: Promise.resolve({ projectId: project.project.id }),
    });

    expect(response.status).toBe(404);
  });

  it("requires a beta-authenticated user", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ projectId: "project-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("rejects invalid roles before creating a token", async () => {
    const userId = await grantBeta("share-invalid@example.com");
    authState.currentUserId = userId;
    const project = await new ServerProjectRepository(db, userId).createProject({
      name: "Shared",
      template: "blank",
    });

    const response = await POST(jsonRequest({ role: "owner" }), {
      params: Promise.resolve({ projectId: project.project.id }),
    });

    expect(response.status).toBe(400);
  });
});
