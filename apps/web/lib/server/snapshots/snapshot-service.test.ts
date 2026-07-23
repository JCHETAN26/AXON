import { type ArchitectureDocument } from "@axon/diagram-schema";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SnapshotService } from "./snapshot-service";
import { type Database } from "../db/client";
import { createTestDatabase, resetTestDatabase } from "../db/testing";
import { ServerProjectRepository } from "../repositories/server-project-repository";
import { seedUser } from "../test-support/seed";

let db: Database;

beforeAll(async () => {
  db = await createTestDatabase();
});
beforeEach(async () => {
  await resetTestDatabase(db);
});

/** Seeds a user + blank project, returning ids and the initial document. */
async function seedProject(email: string) {
  const userId = await seedUser(db, email);
  const repo = new ServerProjectRepository(db, userId);
  const created = await repo.createProject({ name: "P", template: "blank" });
  return { userId, projectId: created.project.id, document: created.document };
}

function withNode(document: ArchitectureDocument, id: string, name: string): ArchitectureDocument {
  return { ...document, nodes: [...document.nodes, { id, name, category: "service" }] };
}

describe("SnapshotService (real DB)", () => {
  it("creates immutable, chained snapshots and lists them newest-first", async () => {
    const { userId, projectId, document } = await seedProject("a@example.com");
    const service = new SnapshotService(db, userId);

    const first = await service.createSnapshot(projectId, document, 1, "manual-snapshot");
    const second = await service.createSnapshot(
      projectId,
      withNode(document, "n1", "API"),
      2,
      "user-edit",
    );

    const list = await service.listSnapshots(projectId);
    expect(list).toHaveLength(2);
    // Newest first; the second chains to the first.
    expect(list[0]?.id).toBe(second);
    expect(list[0]?.previousSnapshotId).toBe(first);

    // The first snapshot's payload is unchanged by later snapshots (immutable).
    const stored = await service.getSnapshot(first);
    expect((stored.payload as ArchitectureDocument).nodes).toHaveLength(0);
  });

  it("computes a semantic diff between two snapshots", async () => {
    const { userId, projectId, document } = await seedProject("a@example.com");
    const service = new SnapshotService(db, userId);
    const base = await service.createSnapshot(projectId, document, 1, "manual-snapshot");
    const next = await service.createSnapshot(
      projectId,
      withNode(document, "n1", "API"),
      2,
      "user-edit",
    );

    const diff = await service.compareSnapshots(base, next);
    expect(diff.baseVersion).toBe(1);
    expect(diff.targetVersion).toBe(2);
    // A component was added; the diff must reflect that change (not empty).
    expect(JSON.stringify(diff)).toContain("n1");
  });

  it("restores a snapshot as a new revision (never rewriting history)", async () => {
    const { userId, projectId, document } = await seedProject("a@example.com");
    const service = new SnapshotService(db, userId);
    const original = await service.createSnapshot(projectId, document, 1, "manual-snapshot");

    const newVersion = await service.restoreSnapshot(projectId, original);
    expect(newVersion).toBeGreaterThan(1);
    // Restoring adds a snapshot; the original remains.
    expect(await service.listSnapshots(projectId)).toHaveLength(2);
    expect((await service.getSnapshot(original)).documentVersion).toBe(1);
  });

  it("scopes snapshots by owner (another user cannot read them)", async () => {
    const { projectId, document, userId } = await seedProject("a@example.com");
    const owner = new SnapshotService(db, userId);
    const snap = await owner.createSnapshot(projectId, document, 1, "manual-snapshot");

    const intruder = new SnapshotService(db, await seedUser(db, "b@example.com"));
    expect(await intruder.listSnapshots(projectId)).toHaveLength(0);
    await expect(intruder.getSnapshot(snap)).rejects.toThrow(/not found/i);
  });
});
