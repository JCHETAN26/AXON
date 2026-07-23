import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CommentService } from "./comment-service";
import { type Database } from "../db/client";
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
  alice = await seedUser(db, "alice-comments@example.com");
  bob = await seedUser(db, "bob-comments@example.com");
});

function projectsFor(ownerId: string) {
  return new ServerProjectRepository(db, ownerId);
}

function commentsFor(ownerId: string) {
  return new CommentService(db, ownerId);
}

describe("CommentService", () => {
  it("creates, lists, and resolves owner-scoped anchored comments", async () => {
    const project = await projectsFor(alice).createProject({
      name: "Commented",
      template: "sample",
    });
    const service = commentsFor(alice);
    const created = await service.createComment({
      projectId: project.project.id,
      authorId: alice,
      body: "Check the retry budget.",
      anchorKind: "node",
      anchorId: "app",
    });

    expect(created).toMatchObject({
      projectId: project.project.id,
      authorId: alice,
      body: "Check the retry budget.",
      anchorKind: "node",
      anchorId: "app",
    });
    await expect(service.listComments(project.project.id)).resolves.toHaveLength(1);

    await expect(
      service.resolveComment(project.project.id, created.id, new Date("2026-07-23T00:00:00.000Z")),
    ).resolves.toBe(true);
    await expect(service.listComments(project.project.id)).resolves.toEqual([
      expect.objectContaining({ id: created.id, resolvedAt: "2026-07-23T00:00:00.000Z" }),
    ]);
  });

  it("validates comment body and anchor shape", async () => {
    const project = await projectsFor(alice).createProject({
      name: "Commented",
      template: "blank",
    });
    const service = commentsFor(alice);

    await expect(
      service.createComment({ projectId: project.project.id, authorId: alice, body: "   " }),
    ).rejects.toThrow(/body/i);
    await expect(
      service.createComment({
        projectId: project.project.id,
        authorId: alice,
        body: "Bad anchor",
        anchorKind: "diagram",
      }),
    ).rejects.toThrow(/anchors/i);
  });

  it("does not let another owner list, create, or resolve comments", async () => {
    const project = await projectsFor(alice).createProject({ name: "Private", template: "blank" });
    const created = await commentsFor(alice).createComment({
      projectId: project.project.id,
      authorId: alice,
      body: "Private note.",
    });

    await expect(commentsFor(bob).listComments(project.project.id)).rejects.toThrow(/not found/i);
    await expect(
      commentsFor(bob).createComment({
        projectId: project.project.id,
        authorId: bob,
        body: "Let me in.",
      }),
    ).rejects.toThrow(/not found/i);
    await expect(commentsFor(bob).resolveComment(project.project.id, created.id)).rejects.toThrow(
      /not found/i,
    );
  });
});
