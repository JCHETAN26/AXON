// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { GET } from "./route";
import { ShareLinkService } from "@/lib/server/collaboration/share-link-service";
import { getDatabaseAsync, type Database } from "@/lib/server/db/client";
import { resetTestDatabase } from "@/lib/server/db/testing";
import { ServerProjectRepository } from "@/lib/server/repositories/server-project-repository";
import { seedUser } from "@/lib/server/test-support/seed";

let db: Database;

beforeAll(async () => {
  process.env.AXON_DB_DRIVER = "pglite";
  db = await getDatabaseAsync();
});

beforeEach(async () => {
  await resetTestDatabase(db);
});

describe("GET /api/share/[token]", () => {
  it("returns a read-only shared project for an active token", async () => {
    const ownerId = await seedUser(db, "share-api-owner@example.com");
    const project = await new ServerProjectRepository(db, ownerId).createProject({
      name: "Shared API",
      template: "sample",
    });
    const shareLink = await new ShareLinkService(db, ownerId).createShareLink({
      projectId: project.project.id,
      role: "viewer",
    });

    const response = await GET(new Request("http://localhost/api/share/token"), {
      params: Promise.resolve({ token: shareLink.rawToken }),
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      role: string;
      project: { id: string; name: string };
      document: { projectId: string };
    };
    expect(payload.role).toBe("viewer");
    expect(payload.project).toEqual({ id: project.project.id, name: "Shared API" });
    expect(payload.document.projectId).toBe(project.project.id);
  });

  it("returns 404 for invalid tokens", async () => {
    const response = await GET(new Request("http://localhost/api/share/invalid"), {
      params: Promise.resolve({ token: "invalid" }),
    });

    expect(response.status).toBe(404);
  });
});
