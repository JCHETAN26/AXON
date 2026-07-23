import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { InstallationClaimError, ServerGithubRepository } from "./server-github-repository";
import { type Database } from "../db/client";
import { createTestDatabase, resetTestDatabase } from "../db/testing";
import { type InstallationInfo, type RemoteRepository } from "../github/gateway";
import { seedUser } from "../test-support/seed";

let db: Database;

beforeAll(async () => {
  db = await createTestDatabase();
});
beforeEach(async () => {
  await resetTestDatabase(db);
});

const installation = (installationId: number): InstallationInfo => ({
  installationId,
  accountId: 999,
  accountLogin: "acme",
  accountType: "Organization",
  permissions: { metadata: "read", contents: "read" },
});

const repo = (repoGithubId: number): RemoteRepository => ({
  repoGithubId,
  ownerLogin: "acme",
  name: "api",
  fullName: "acme/api",
  defaultBranch: "main",
  visibility: "private",
  archived: false,
  url: "https://github.com/acme/api",
});

describe("ServerGithubRepository", () => {
  it("links an installation and is idempotent on re-link", async () => {
    const user = await seedUser(db, "a@example.com");
    const store = new ServerGithubRepository(db, user);
    const first = await store.linkInstallation(installation(1001));
    const again = await store.linkInstallation(installation(1001));
    expect(again.id).toBe(first.id);
    expect((await store.listInstallations()).length).toBe(1);
  });

  it("rejects claiming an installation bound to another user", async () => {
    const a = await seedUser(db, "a@example.com");
    const b = await seedUser(db, "b@example.com");
    await new ServerGithubRepository(db, a).linkInstallation(installation(1001));
    await expect(
      new ServerGithubRepository(db, b).linkInstallation(installation(1001)),
    ).rejects.toBeInstanceOf(InstallationClaimError);
  });

  it("scopes reads by owner (another user sees nothing / not-found)", async () => {
    const a = await seedUser(db, "a@example.com");
    const b = await seedUser(db, "b@example.com");
    const storeA = new ServerGithubRepository(db, a);
    const conn = await storeA.linkInstallation(installation(1001));

    const storeB = new ServerGithubRepository(db, b);
    expect(await storeB.getInstallation(conn.id)).toBeNull();
    expect(await storeB.listInstallations()).toHaveLength(0);
  });

  it("connects a granted repository only under an owned installation", async () => {
    const a = await seedUser(db, "a@example.com");
    const b = await seedUser(db, "b@example.com");
    const storeA = new ServerGithubRepository(db, a);
    const conn = await storeA.linkInstallation(installation(1001));

    // User B cannot attach a repository to User A's installation.
    expect(await new ServerGithubRepository(db, b).connectRepository(conn.id, repo(42))).toBeNull();

    const connected = await storeA.connectRepository(conn.id, repo(42));
    expect(connected?.repoGithubId).toBe(42);
    // Idempotent on the stable GitHub id.
    await storeA.connectRepository(conn.id, { ...repo(42), name: "api" });
    expect(await storeA.listRepositories()).toHaveLength(1);
  });

  it("cascades repositories when an installation is disconnected", async () => {
    const user = await seedUser(db, "a@example.com");
    const store = new ServerGithubRepository(db, user);
    const conn = await store.linkInstallation(installation(1001));
    await store.connectRepository(conn.id, repo(42));
    await store.disconnectInstallation(conn.id);
    expect(await store.listRepositories()).toHaveLength(0);
  });
});
