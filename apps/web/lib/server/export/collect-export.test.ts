import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { type Database } from "../db/client";
import { artifacts, feedback, generationUsage } from "../db/schema";
import { createTestDatabase, resetTestDatabase } from "../db/testing";
import { createInvite, redeemInvite } from "../beta";
import { ServerProjectRepository } from "../repositories/server-project-repository";
import { seedUser } from "../test-support/seed";
import { collectAccountExport, collectProjectExport } from "./collect-export";

let db: Database;

beforeAll(async () => {
  db = await createTestDatabase();
});
beforeEach(async () => {
  await resetTestDatabase(db);
});

async function betaUser(email: string): Promise<string> {
  const id = await seedUser(db, email);
  await createInvite(db, `INV-${email}`);
  await redeemInvite(db, id, `INV-${email}`);
  return id;
}

describe("collectProjectExport (owner-scoped)", () => {
  it("exports the owner's project as a validated bundle", async () => {
    const alice = await betaUser("alice@example.com");
    const created = await new ServerProjectRepository(db, alice).createProject({
      name: "Alpha",
      template: "sample",
    });

    const bundle = await collectProjectExport(db, alice, created.project.id);
    expect(bundle?.project.name).toBe("Alpha");
    expect(bundle?.architectureDocument.id).toBe(created.project.id);
  });

  it("returns null for another user's project (User B cannot export User A's project)", async () => {
    const alice = await betaUser("alice@example.com");
    const bob = await betaUser("bob@example.com");
    const created = await new ServerProjectRepository(db, alice).createProject({
      name: "Secret",
      template: "blank",
    });
    expect(await collectProjectExport(db, bob, created.project.id)).toBeNull();
  });

  it("reduces a Compose import draft to a summary without the raw YAML", async () => {
    const alice = await betaUser("alice@example.com");
    const created = await new ServerProjectRepository(db, alice).createProject({
      name: "WithImport",
      template: "blank",
    });
    await db.insert(artifacts).values({
      projectId: created.project.id,
      ownerId: alice,
      kind: "import",
      payload: {
        schemaVersion: "1.0",
        projectId: created.project.id,
        composeText:
          "services:\n  db:\n    image: postgres\n    environment: { PASSWORD: hunter2 }",
        categoryOverrides: {},
        updatedAt: "2026-07-20T00:00:00.000Z",
      },
    });

    const bundle = await collectProjectExport(db, alice, created.project.id);
    const serialized = JSON.stringify(bundle);
    expect(serialized).not.toContain("hunter2");
    expect(serialized).not.toContain("composeText");
    expect(bundle?.importSummary?.hasDraft).toBe(true);
  });
});

describe("collectAccountExport (owner-scoped)", () => {
  it("contains only the authenticated user's data", async () => {
    const alice = await betaUser("alice@example.com");
    const bob = await betaUser("bob@example.com");
    await new ServerProjectRepository(db, alice).createProject({
      name: "Alice-1",
      template: "blank",
    });
    await new ServerProjectRepository(db, bob).createProject({ name: "Bob-1", template: "blank" });

    const result = await collectAccountExport(db, alice);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bundle.projects.map((p) => p.project.name)).toEqual(["Alice-1"]);
    expect(result.bundle.account.email).toBe("alice@example.com");
    expect(JSON.stringify(result.bundle)).not.toContain("Bob-1");
  });

  it("excludes feedback message bodies and any tokens", async () => {
    const alice = await betaUser("alice@example.com");
    await db.insert(feedback).values({
      userId: alice,
      category: "idea",
      message: "SECRET-FEEDBACK-BODY-DO-NOT-EXPORT",
    });
    await db
      .insert(generationUsage)
      .values({ userId: alice, day: "2026-07-21", count: 3, lastRequestAt: new Date() });

    const result = await collectAccountExport(db, alice);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.bundle);
    // Feedback metadata only.
    expect(result.bundle.feedback[0]?.category).toBe("idea");
    expect(serialized).not.toContain("SECRET-FEEDBACK-BODY-DO-NOT-EXPORT");
    // Usage counters included.
    expect(result.bundle.generationUsage[0]).toMatchObject({ day: "2026-07-21", count: 3 });
    // No auth/session/token material.
    expect(serialized).not.toMatch(/access_token|session_token|refresh_token|AUTH_SECRET/);
  });
});
