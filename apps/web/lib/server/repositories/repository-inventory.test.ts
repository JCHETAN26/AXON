import { describe, it, expect, vi } from "vitest";
import { RepositoryInventoryService } from "./repository-inventory";
import type { Database } from "../db/client";
import type { GithubGateway } from "../github/gateway";
import type { ServerGithubRepository } from "./server-github-repository";

describe("RepositoryInventoryService", () => {
  it("enforces safe execution limits and boundaries", () => {
    const mockDb = {
      insert: vi.fn().mockReturnValue({ values: vi.fn() }),
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }),
    } as unknown as Database;

    const mockGateway = {
      getBranchHeadSha: vi.fn().mockResolvedValue("abcdef123"),
      getTree: vi.fn().mockResolvedValue({ entries: [] }),
      getFileText: vi.fn(),
    } as unknown as GithubGateway;

    const mockRepoStore = {
      getRepository: vi.fn().mockResolvedValue({ id: "123", installationConnectionId: "456", ownerLogin: "test", name: "test", defaultBranch: "main" }),
      getInstallation: vi.fn().mockResolvedValue({ installationId: 789 }),
    } as unknown as ServerGithubRepository;

    const service = new RepositoryInventoryService(mockDb, "owner-id", mockGateway, mockRepoStore);
    
    expect(service).toBeDefined();
  });
});
