import { afterEach, describe, it, expect, vi } from "vitest";
import { LocalAgentService } from "./agent-service";
import type { Database } from "../db/client";

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
