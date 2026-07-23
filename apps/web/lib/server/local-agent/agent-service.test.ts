import { eq, sql } from "drizzle-orm";
import { afterEach, describe, it, expect, vi } from "vitest";

import { LocalAgentService } from "./agent-service";
import type { Database } from "../db/client";
import { createTestDatabase, resetTestDatabase } from "../db/testing";
import { localAgentConnections, users } from "../db/schema";

function mockDb() {
  return {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "agent-1" }]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
          orderBy: vi.fn().mockResolvedValue([]),
        }),
        orderBy: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  } as unknown as Database;
}

describe("LocalAgentService", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates agent with hashed token", async () => {
    const db = mockDb();
    const service = new LocalAgentService(db, "user-1");

    const result = await service.createAgent({
      agentName: "Dev Laptop",
      machineLabel: "laptop-mac",
      workspaceScope: "project-1",
    });

    expect(result.agentId).toBe("agent-1");
    expect(result.token).toMatch(/^axon_agent_[a-f0-9]{64}$/);
    expect(db.insert).toHaveBeenCalled();
  });

  it("returns null for invalid token validation", async () => {
    const db = mockDb();
    const service = new LocalAgentService(db, "user-1");

    const result = await service.validateToken("invalid-token");
    expect(result).toBeNull();
  });

  it("validates an unused unexpired pairing token once", async () => {
    const createdAt = new Date("2026-07-22T10:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T10:04:00Z"));
    const db = mockDbWithValidationRows([
      {
        id: "agent-1",
        ownerId: "user-1",
        agentName: "Dev Laptop",
        machineLabel: "laptop-mac",
        workspaceScope: "project-1",
        allowedCapabilities: ["analyze"],
        lastConnectedAt: null,
        revokedAt: null,
        createdAt,
      },
    ]);
    const service = new LocalAgentService(db, "user-1");

    const result = await service.validateToken("axon_agent_test");

    expect(result?.id).toBe("agent-1");
    expect(result?.lastConnectedAt).toEqual(new Date("2026-07-22T10:04:00Z"));
    expect(db.update).toHaveBeenCalled();
  });

  it("rejects expired pairing tokens", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T10:06:00Z"));
    const db = mockDbWithValidationRows([
      {
        id: "agent-1",
        ownerId: "user-1",
        agentName: "Dev Laptop",
        machineLabel: "laptop-mac",
        workspaceScope: "project-1",
        allowedCapabilities: [],
        lastConnectedAt: null,
        revokedAt: null,
        createdAt: new Date("2026-07-22T10:00:00Z"),
      },
    ]);
    const service = new LocalAgentService(db, "user-1");

    await expect(service.validateToken("axon_agent_expired")).resolves.toBeNull();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects replayed pairing tokens", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T10:01:00Z"));
    const db = mockDbWithValidationRows([
      {
        id: "agent-1",
        ownerId: "user-1",
        agentName: "Dev Laptop",
        machineLabel: "laptop-mac",
        workspaceScope: "project-1",
        allowedCapabilities: [],
        lastConnectedAt: new Date("2026-07-22T10:00:30Z"),
        revokedAt: null,
        createdAt: new Date("2026-07-22T10:00:00Z"),
      },
    ]);
    const service = new LocalAgentService(db, "user-1");

    await expect(service.validateToken("axon_agent_replayed")).resolves.toBeNull();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("revokes agent connection", async () => {
    const db = mockDb();
    const service = new LocalAgentService(db, "user-1");

    await service.revokeAgent("agent-1");
    expect(db.update).toHaveBeenCalled();
  });

  it("lists agents for owner", async () => {
    const db = mockDb();
    const service = new LocalAgentService(db, "user-1");

    const agents = await service.listAgents();
    expect(Array.isArray(agents)).toBe(true);
  });

  it("exchanges a pairing token for a durable credential exactly once", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T10:04:00Z"));
    const db = mockDbWithValidationRows([
      {
        id: "agent-1",
        ownerId: "user-1",
        agentName: "Dev Laptop",
        machineLabel: "laptop-mac",
        workspaceScope: "project-1",
        allowedCapabilities: ["analyze"],
        lastConnectedAt: null,
        revokedAt: null,
        createdAt: new Date("2026-07-22T10:00:00Z"),
      },
    ]);
    const service = new LocalAgentService(db, "unused");

    const result = await service.exchangePairingToken("agent-1", "axon_agent_test");

    expect(result?.credential).toMatch(/^axon_agent_cred_[a-f0-9]{64}$/);
    expect(result?.agent.ownerId).toBe("user-1");
    expect(db.update).toHaveBeenCalled();
  });

  it("authenticates durable credentials without requiring a browser owner context", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T10:05:00Z"));
    const db = mockDbWithValidationRows([
      {
        id: "agent-1",
        ownerId: "user-1",
        agentName: "Dev Laptop",
        machineLabel: "laptop-mac",
        workspaceScope: "project-1",
        allowedCapabilities: ["sync"],
        lastConnectedAt: new Date("2026-07-22T10:04:00Z"),
        revokedAt: null,
        createdAt: new Date("2026-07-22T10:00:00Z"),
      },
    ]);
    const service = new LocalAgentService(db, "unused");

    const result = await service.authenticateCredential("agent-1", "axon_agent_cred_test");

    expect(result?.ownerId).toBe("user-1");
    expect(result?.lastConnectedAt).toEqual(new Date("2026-07-22T10:05:00Z"));
    expect(db.update).toHaveBeenCalled();
  });

  it("rejects malformed durable credentials before querying", async () => {
    const db = mockDbWithValidationRows([]);
    const service = new LocalAgentService(db, "unused");

    await expect(
      service.authenticateCredential("agent-1", "axon_agent_pairing"),
    ).resolves.toBeNull();
    expect(db.select).not.toHaveBeenCalled();
  });
});

describe("LocalAgentService with migrated database", () => {
  it("persists only hashed durable credentials and rejects revoked agents", async () => {
    const db = await createTestDatabase();
    await resetTestDatabase(db);
    const insertedUsers = await db
      .insert(users)
      .values({ email: "local-agent@example.com" })
      .returning({ id: users.id });
    const ownerId = insertedUsers[0]?.id;
    if (!ownerId) throw new Error("failed to insert owner");

    const service = new LocalAgentService(db, ownerId);
    const created = await service.createAgent({
      agentName: "Dev Laptop",
      machineLabel: "macbook",
      workspaceScope: "project-1",
      allowedCapabilities: ["sync"],
    });

    const rows = await db
      .select({
        tokenHash: localAgentConnections.tokenHash,
        credentialHash: localAgentConnections.credentialHash,
        credentialIssuedAt: localAgentConnections.credentialIssuedAt,
        createdAt: localAgentConnections.createdAt,
      })
      .from(localAgentConnections)
      .where(eq(localAgentConnections.id, created.agentId));

    const createdAt = rows[0]?.createdAt;
    if (!createdAt) throw new Error("missing agent createdAt");
    vi.useFakeTimers();
    vi.setSystemTime(new Date(createdAt.getTime() + 60_000));

    const exchanged = await service.exchangePairingToken(created.agentId, created.token);

    expect(exchanged?.credential).toMatch(/^axon_agent_cred_[a-f0-9]{64}$/);

    const credentialRows = await db
      .select({
        tokenHash: localAgentConnections.tokenHash,
        credentialHash: localAgentConnections.credentialHash,
        credentialIssuedAt: localAgentConnections.credentialIssuedAt,
      })
      .from(localAgentConnections)
      .where(eq(localAgentConnections.id, created.agentId));

    expect(credentialRows[0]?.tokenHash).not.toBe(created.token);
    expect(credentialRows[0]?.credentialHash).toMatch(/^[a-f0-9]{64}$/);
    expect(credentialRows[0]?.credentialHash).not.toBe(exchanged?.credential);
    expect(credentialRows[0]?.credentialIssuedAt).toBeInstanceOf(Date);

    const authenticated = await service.authenticateCredential(
      created.agentId,
      exchanged?.credential ?? "",
    );
    expect(authenticated?.ownerId).toBe(ownerId);

    await service.revokeAgent(created.agentId);
    await expect(
      service.authenticateCredential(created.agentId, exchanged?.credential ?? ""),
    ).resolves.toBeNull();

    const columnCheck = await db.execute(sql`
      select credential_hash, credential_issued_at
      from local_agent_connections
      where id = ${created.agentId}
    `);
    expect(columnCheck).toBeDefined();
  }, 15_000);
});

function mockDbWithValidationRows(rows: unknown[]) {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(rows),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  } as unknown as Database;
}
