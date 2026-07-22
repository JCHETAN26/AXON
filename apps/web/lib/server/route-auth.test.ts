import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { type AuthenticatedUser } from "./authz";
import { createInvite, redeemInvite } from "./beta";
import { type Database } from "./db/client";
import { createTestDatabase, resetTestDatabase } from "./db/testing";
import { resolveBetaRoute } from "./route-auth";
import { seedUser } from "./test-support/seed";

let db: Database;

beforeAll(async () => {
  db = await createTestDatabase();
});

beforeEach(async () => {
  await resetTestDatabase(db);
});

const asUser = (user: AuthenticatedUser | null) => () => Promise.resolve(user);

async function grantBeta(email: string): Promise<string> {
  const id = await seedUser(db, email);
  await createInvite(db, `INV-${email}`);
  await redeemInvite(db, id, `INV-${email}`);
  return id;
}

describe("resolveBetaRoute", () => {
  it("returns 401 for an unauthenticated request", async () => {
    const result = await resolveBetaRoute(asUser(null), db);
    expect(result).toBeInstanceOf(Response);
    if (result instanceof Response) expect(result.status).toBe(401);
  });

  it("returns 403 for a signed-in user without beta access", async () => {
    const id = await seedUser(db, "a@example.com");
    const result = await resolveBetaRoute(asUser({ id }), db);
    expect(result).toBeInstanceOf(Response);
    if (result instanceof Response) expect(result.status).toBe(403);
  });

  it("hands a beta user their own owner-scoped repositories", async () => {
    const id = await grantBeta("owner@example.com");
    const ctx = await resolveBetaRoute(asUser({ id }), db);
    expect(ctx).not.toBeInstanceOf(Response);
    if (ctx instanceof Response) return;

    expect(ctx.user.id).toBe(id);
    const created = await ctx.projects.createProject({ name: "Mine", template: "blank" });
    expect(await ctx.projects.getProject(created.project.id)).not.toBeNull();
  });

  it("scopes the repositories so one beta user cannot reach another's project", async () => {
    const alice = await grantBeta("alice@example.com");
    const bob = await grantBeta("bob@example.com");

    const aliceCtx = await resolveBetaRoute(asUser({ id: alice }), db);
    const bobCtx = await resolveBetaRoute(asUser({ id: bob }), db);
    if (aliceCtx instanceof Response || bobCtx instanceof Response) throw new Error("denied");

    const alicesProject = await aliceCtx.projects.createProject({
      name: "Secret",
      template: "sample",
    });
    // Bob's route context cannot read Alice's project even with the id.
    expect(await bobCtx.projects.getProject(alicesProject.project.id)).toBeNull();
  });
});
