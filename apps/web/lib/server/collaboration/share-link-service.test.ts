import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ShareLinkService } from "./share-link-service";
import { type Database } from "../db/client";
import { projectShareLinks } from "../db/schema";
import { createTestDatabase, resetTestDatabase } from "../db/testing";
import { ServerProjectRepository } from "../repositories/server-project-repository";
import { seedUser } from "../test-support/seed";

let db: Database;
let alice: string;
let bob: string;

beforeAll(async () => {
  db = await createTestDatabase();
});

beforeEach(async () => {
  await resetTestDatabase(db);
  alice = await seedUser(db, "alice@example.com");
  bob = await seedUser(db, "bob@example.com");
});

function projectsFor(ownerId: string) {
  return new ServerProjectRepository(db, ownerId);
}

function sharesFor(ownerId: string) {
  return new ShareLinkService(db, ownerId);
}

describe("ShareLinkService", () => {
  it("creates a share link and stores only the hashed token", async () => {
    const project = await projectsFor(alice).createProject({ name: "Shared", template: "sample" });
    const created = await sharesFor(alice).createShareLink({
      projectId: project.project.id,
      role: "viewer",
      label: "Design review",
    });

    expect(created.rawToken).toHaveLength(43);
    expect(created.role).toBe("viewer");
    expect(created.label).toBe("Design review");

    const rows = await db.select().from(projectShareLinks);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.tokenHash).toHaveLength(64);
    expect(rows[0]?.tokenHash).not.toContain(created.rawToken);

    const listed = await sharesFor(alice).listShareLinks(project.project.id);
    expect(listed).toHaveLength(1);
    expect(listed[0]).not.toHaveProperty("rawToken");
  });

  it("resolves active tokens without revealing revoked or expired links", async () => {
    const project = await projectsFor(alice).createProject({ name: "Shared", template: "blank" });
    const service = sharesFor(alice);
    const created = await service.createShareLink({
      projectId: project.project.id,
      role: "commenter",
      expiresAt: new Date("2026-08-01T00:00:00.000Z"),
    });

    await expect(
      service.resolveShareToken(created.rawToken, new Date("2026-07-23T00:00:00.000Z")),
    ).resolves.toMatchObject({ projectId: project.project.id, role: "commenter" });
    await expect(
      service.resolveSharedProject(created.rawToken, new Date("2026-07-23T00:00:00.000Z")),
    ).resolves.toMatchObject({
      projectId: project.project.id,
      projectName: "Shared",
      role: "commenter",
      document: expect.objectContaining({ projectId: project.project.id }),
    });
    await expect(
      service.resolveShareToken(created.rawToken, new Date("2026-08-02T00:00:00.000Z")),
    ).resolves.toBeNull();
    await expect(
      service.resolveSharedProject(created.rawToken, new Date("2026-08-02T00:00:00.000Z")),
    ).resolves.toBeNull();

    await service.revokeShareLink(
      project.project.id,
      created.id,
      new Date("2026-07-24T00:00:00.000Z"),
    );
    await expect(
      service.resolveShareToken(created.rawToken, new Date("2026-07-25T00:00:00.000Z")),
    ).resolves.toBeNull();
    await expect(
      service.resolveSharedProject(created.rawToken, new Date("2026-07-25T00:00:00.000Z")),
    ).resolves.toBeNull();
  });

  it("rejects owner grants and already-expired links", async () => {
    const project = await projectsFor(alice).createProject({ name: "Shared", template: "blank" });
    const service = sharesFor(alice);

    await expect(
      service.createShareLink({ projectId: project.project.id, role: "owner" }),
    ).rejects.toThrow(/cannot grant owner/i);
    await expect(
      service.createShareLink({
        projectId: project.project.id,
        role: "viewer",
        expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      }),
    ).rejects.toThrow(/future/i);
  });

  it("does not let another owner list or revoke share links", async () => {
    const project = await projectsFor(alice).createProject({ name: "Shared", template: "blank" });
    const created = await sharesFor(alice).createShareLink({
      projectId: project.project.id,
      role: "viewer",
    });

    await expect(sharesFor(bob).listShareLinks(project.project.id)).rejects.toThrow(/not found/i);
    await expect(sharesFor(bob).revokeShareLink(project.project.id, created.id)).rejects.toThrow(
      /not found/i,
    );

    await expect(sharesFor(alice).resolveShareToken(created.rawToken)).resolves.toMatchObject({
      projectId: project.project.id,
    });
  });
});
