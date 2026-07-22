import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ServerArtifactRepository } from "./server-artifact-repository";
import { ServerProjectRepository } from "./server-project-repository";
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

async function projectFor(userId: string): Promise<string> {
  const created = await new ServerProjectRepository(db, userId).createProject({
    name: "P",
    template: "blank",
  });
  return created.project.id;
}

describe("ServerArtifactRepository", () => {
  it("round-trips an artifact for the owner", async () => {
    const projectId = await projectFor(alice);
    const repo = new ServerArtifactRepository(db, alice);
    await repo.save(projectId, "audit", { findings: [] });
    expect(await repo.get(projectId, "audit")).toEqual({ findings: [] });
  });

  it("keeps artifact kinds independent", async () => {
    const projectId = await projectFor(alice);
    const repo = new ServerArtifactRepository(db, alice);
    await repo.save(projectId, "audit", { a: 1 });
    await repo.save(projectId, "simulation", { s: 2 });
    expect(await repo.get(projectId, "audit")).toEqual({ a: 1 });
    expect(await repo.get(projectId, "simulation")).toEqual({ s: 2 });
  });

  describe("IDOR protection", () => {
    it("returns null when reading another user's artifact", async () => {
      const projectId = await projectFor(alice);
      await new ServerArtifactRepository(db, alice).save(projectId, "audit", { secret: true });
      // Bob knows the project id but cannot read Alice's audit results.
      expect(await new ServerArtifactRepository(db, bob).get(projectId, "audit")).toBeNull();
    });

    it("refuses to write an artifact into another user's project", async () => {
      const projectId = await projectFor(alice);
      await expect(
        new ServerArtifactRepository(db, bob).save(projectId, "recommendation", { x: 1 }),
      ).rejects.toThrow(/not found/i);
      // Nothing was written.
      expect(
        await new ServerArtifactRepository(db, alice).get(projectId, "recommendation"),
      ).toBeNull();
    });
  });
});
