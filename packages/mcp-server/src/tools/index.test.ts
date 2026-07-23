import { describe, expect, it } from "vitest";

import { createMcpTools, InventoryFilesInput } from "./index";
import { MCP_SERVER_VERSION, WorkspaceStore } from "../workspace-store";

describe("MCP local tools", () => {
  it("validates inventory file limits with strict schemas", () => {
    expect(InventoryFilesInput.safeParse({ rootDir: "/tmp/workspace", maxFiles: 10 }).success).toBe(
      true,
    );
    expect(InventoryFilesInput.safeParse({ rootDir: "/tmp/workspace", maxFiles: 0 }).success).toBe(
      false,
    );
  });

  it("returns a safe empty architecture response before analysis", async () => {
    const tools = createMcpTools(new WorkspaceStore());

    await expect(
      tools.axon_get_architecture.handler({ rootDir: "/tmp/not-analyzed" }),
    ).resolves.toEqual({
      version: MCP_SERVER_VERSION,
      provenance: "locally-observed",
      architecture: null,
      message: "No architecture analyzed yet. Run axon_analyze_repository first.",
    });
  });

  it("lists evidence from in-memory workspace state", async () => {
    const store = new WorkspaceStore();
    store.getOrCreate("/tmp/workspace").evidence = [
      { id: "one", filePath: "src/a.ts" },
      { id: "two", filePath: "src/b.ts" },
    ];
    const tools = createMcpTools(store);

    await expect(
      tools.axon_list_evidence.handler({ rootDir: "/tmp/workspace", limit: 1 }),
    ).resolves.toMatchObject({
      version: MCP_SERVER_VERSION,
      provenance: "locally-observed",
      evidence: [{ id: "one", filePath: "src/a.ts" }],
      totalCount: 2,
      returnedCount: 1,
    });
  });
});
