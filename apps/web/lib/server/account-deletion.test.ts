import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createInvite, hasBetaAccess, redeemInvite } from "./beta";
import { accountExists, deleteAccount } from "./account-deletion";
import { type Database } from "./db/client";
import { artifacts, betaInvites, feedback, projects } from "./db/schema";
import { createTestDatabase, resetTestDatabase } from "./db/testing";
import { ServerProjectRepository } from "./repositories/server-project-repository";
import { seedUser } from "./test-support/seed";

let db: Database;

beforeAll(async () => {
  db = await createTestDatabase();
});
beforeEach(async () => {
  await resetTestDatabase(db);
});

async function betaUser(email: string, code: string): Promise<string> {
  const id = await seedUser(db, email);
  await createInvite(db, code);
  await redeemInvite(db, id, code);
  return id;
}

describe("deleteAccount", () => {
  it("removes the account and all owner-scoped product data", async () => {
    const alice = await betaUser("alice@example.com", "INV-A");
    const created = await new ServerProjectRepository(db, alice).createProject({
      name: "Alpha",
      template: "sample",
    });
    await db.insert(artifacts).values({
      projectId: created.project.id,
      ownerId: alice,
      kind: "audit",
      payload: { any: "thing" },
    });
    await db.insert(feedback).values({ userId: alice, category: "idea", message: "hi" });

    const result = await deleteAccount(db, alice);
    expect(result.ok).toBe(true);

    expect(await accountExists(db, alice)).toBe(false);
    expect(await hasBetaAccess(db, alice)).toBe(false);
    expect(await db.select().from(projects).where(eq(projects.ownerId, alice))).toEqual([]);
    expect(await db.select().from(artifacts).where(eq(artifacts.ownerId, alice))).toEqual([]);
    expect(await db.select().from(feedback).where(eq(feedback.userId, alice))).toEqual([]);
  });

  it("retains the invite row with redemption cleared (abuse prevention)", async () => {
    const alice = await betaUser("alice@example.com", "INV-A");
    await deleteAccount(db, alice);

    const invites = await db.select().from(betaInvites).where(eq(betaInvites.code, "INV-A"));
    expect(invites).toHaveLength(1);
    expect(invites[0]?.redeemedByUserId).toBeNull();
  });

  it("does not touch another user's data", async () => {
    const alice = await betaUser("alice@example.com", "INV-A");
    const bob = await betaUser("bob@example.com", "INV-B");
    const bobProject = await new ServerProjectRepository(db, bob).createProject({
      name: "Bob-Keep",
      template: "blank",
    });

    await deleteAccount(db, alice);

    expect(await accountExists(db, bob)).toBe(true);
    expect(await hasBetaAccess(db, bob)).toBe(true);
    expect(
      await new ServerProjectRepository(db, bob).getProject(bobProject.project.id),
    ).not.toBeNull();
  });

  it("returns failure (not success) when the account does not exist", async () => {
    const result = await deleteAccount(db, "00000000-0000-0000-0000-000000000000");
    expect(result.ok).toBe(false);
  });

  it("is idempotent-safe: a second deletion fails without affecting others", async () => {
    const alice = await betaUser("alice@example.com", "INV-A");
    const bob = await betaUser("bob@example.com", "INV-B");
    expect((await deleteAccount(db, alice)).ok).toBe(true);
    expect((await deleteAccount(db, alice)).ok).toBe(false);
    expect(await accountExists(db, bob)).toBe(true);
  });
});
