import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ConcurrencyError, ServerProjectRepository } from "./server-project-repository";
import { type Database } from "../db/client";
import { createTestDatabase, resetTestDatabase } from "../db/testing";
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

function repoFor(userId: string) {
  return new ServerProjectRepository(db, userId);
}

describe("ServerProjectRepository", () => {
  it("creates and reads back a project scoped to its owner", async () => {
    const repo = repoFor(alice);
    const created = await repo.createProject({ name: "Alpha", template: "blank" });
    expect(created.project.name).toBe("Alpha");

    const loaded = await repo.getProject(created.project.id);
    expect(loaded?.project.id).toBe(created.project.id);
    expect(loaded?.document.projectId).toBe(created.project.id);
  });

  it("lists only the caller's own projects", async () => {
    await repoFor(alice).createProject({ name: "Alice-1", template: "blank" });
    await repoFor(bob).createProject({ name: "Bob-1", template: "blank" });

    const aliceProjects = await repoFor(alice).listProjects();
    expect(aliceProjects.map((project) => project.name)).toEqual(["Alice-1"]);
  });

  describe("IDOR protection", () => {
    it("returns not-found when reading another user's project", async () => {
      const alicesProject = await repoFor(alice).createProject({
        name: "Secret",
        template: "blank",
      });
      // Bob knows the id but must not be able to read it.
      expect(await repoFor(bob).getProject(alicesProject.project.id)).toBeNull();
    });

    it("refuses to modify another user's project", async () => {
      const alicesProject = await repoFor(alice).createProject({
        name: "Secret",
        template: "sample",
      });
      await expect(
        repoFor(bob).updateDocument(alicesProject.project.id, alicesProject.document),
      ).rejects.toThrow(/not found/i);
    });

    it("does not delete another user's project", async () => {
      const alicesProject = await repoFor(alice).createProject({
        name: "Secret",
        template: "blank",
      });
      await repoFor(bob).deleteProject(alicesProject.project.id);
      // Still there for Alice.
      expect(await repoFor(alice).getProject(alicesProject.project.id)).not.toBeNull();
    });
  });

  describe("optimistic concurrency", () => {
    it("accepts a write that presents the current version and bumps it", async () => {
      const repo = repoFor(alice);
      const created = await repo.createProject({ name: "Alpha", template: "sample" });
      expect(await repo.getDocumentVersion(created.project.id)).toBe(1);

      await repo.updateDocument(created.project.id, created.document, 1);
      expect(await repo.getDocumentVersion(created.project.id)).toBe(2);
    });

    it("rejects a write that presents a stale version", async () => {
      const repo = repoFor(alice);
      const created = await repo.createProject({ name: "Alpha", template: "sample" });
      await repo.updateDocument(created.project.id, created.document, 1);

      // Version is now 2; a writer still holding version 1 loses the race.
      await expect(repo.updateDocument(created.project.id, created.document, 1)).rejects.toThrow(
        ConcurrencyError,
      );
    });
  });

  it("rejects a document whose identity does not match the project", async () => {
    const repo = repoFor(alice);
    const created = await repo.createProject({ name: "Alpha", template: "blank" });
    const foreign = { ...created.document, id: "someone-else", projectId: "someone-else" };
    await expect(repo.updateDocument(created.project.id, foreign)).rejects.toThrow(/identity/i);
  });
});
