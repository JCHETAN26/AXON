import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApprovalService } from "./approval-service";
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
  alice = await seedUser(db, "alice-approvals@example.com");
  bob = await seedUser(db, "bob-approvals@example.com");
});

function projectsFor(ownerId: string) {
  return new ServerProjectRepository(db, ownerId);
}

function approvalsFor(ownerId: string) {
  return new ApprovalService(db, ownerId);
}

describe("ApprovalService", () => {
  it("creates, lists, and decides project approvals", async () => {
    const project = await projectsFor(alice).createProject({
      name: "Approved",
      template: "sample",
    });
    const service = approvalsFor(alice);
    const created = await service.createApproval({
      projectId: project.project.id,
      requesterId: alice,
      subjectKind: "architecture",
      subjectId: project.document.id,
      title: "Approve reference architecture",
      description: "Ready for founder review.",
    });

    expect(created).toMatchObject({
      projectId: project.project.id,
      requesterId: alice,
      subjectKind: "architecture",
      status: "pending",
    });
    await expect(service.listApprovals(project.project.id)).resolves.toHaveLength(1);

    await expect(
      service.decideApproval(
        project.project.id,
        created.id,
        "approved",
        alice,
        new Date("2026-07-23T00:00:00.000Z"),
      ),
    ).resolves.toMatchObject({
      id: created.id,
      status: "approved",
      decidedByUserId: alice,
      decidedAt: "2026-07-23T00:00:00.000Z",
    });
    await expect(
      service.decideApproval(project.project.id, created.id, "rejected", alice),
    ).resolves.toBeNull();
  });

  it("validates approval title and subject", async () => {
    const project = await projectsFor(alice).createProject({ name: "Approved", template: "blank" });
    const service = approvalsFor(alice);

    await expect(
      service.createApproval({
        projectId: project.project.id,
        requesterId: alice,
        subjectKind: "architecture",
        subjectId: project.project.id,
        title: " ",
      }),
    ).rejects.toThrow(/title/i);
    await expect(
      service.createApproval({
        projectId: project.project.id,
        requesterId: alice,
        subjectKind: "architecture",
        subjectId: " ",
        title: "Approve",
      }),
    ).rejects.toThrow(/subject/i);
  });

  it("does not let another owner list, request, or decide approvals", async () => {
    const project = await projectsFor(alice).createProject({ name: "Private", template: "blank" });
    const created = await approvalsFor(alice).createApproval({
      projectId: project.project.id,
      requesterId: alice,
      subjectKind: "architecture",
      subjectId: project.project.id,
      title: "Private approval",
    });

    await expect(approvalsFor(bob).listApprovals(project.project.id)).rejects.toThrow(/not found/i);
    await expect(
      approvalsFor(bob).createApproval({
        projectId: project.project.id,
        requesterId: bob,
        subjectKind: "architecture",
        subjectId: project.project.id,
        title: "Let me in",
      }),
    ).rejects.toThrow(/not found/i);
    await expect(
      approvalsFor(bob).decideApproval(project.project.id, created.id, "approved", bob),
    ).rejects.toThrow(/not found/i);
  });
});
