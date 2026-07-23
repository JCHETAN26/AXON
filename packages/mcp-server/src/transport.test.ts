import { Readable } from "node:stream";
import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { createMcpTools } from "./tools/index";
import {
  getMcpToolDefinitions,
  handleMcpJsonRpcRequest,
  runMcpStdioServer,
  runCli,
} from "./transport";
import { MCP_SERVER_VERSION, WorkspaceStore } from "./workspace-store";

describe("MCP stdio transport", () => {
  it("advertises server capabilities during initialize", async () => {
    const tools = createMcpTools(new WorkspaceStore());

    await expect(
      handleMcpJsonRpcRequest({ jsonrpc: "2.0", id: 1, method: "initialize" }, tools),
    ).resolves.toEqual({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "axon-mcp", version: MCP_SERVER_VERSION },
      },
    });
  });

  it("lists only AXON local tools", async () => {
    const tools = createMcpTools(new WorkspaceStore());
    const response = await handleMcpJsonRpcRequest(
      { jsonrpc: "2.0", id: "tools", method: "tools/list" },
      tools,
    );

    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: "tools",
      result: {
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "axon_inspect_workspace" }),
          expect.objectContaining({ name: "axon_analyze_repository" }),
          expect.objectContaining({ name: "axon_create_scenario" }),
          expect.objectContaining({ name: "axon_simulate_scenario" }),
          expect.objectContaining({ name: "axon_update_architecture_proposal" }),
          expect.objectContaining({ name: "axon_compare_snapshots" }),
          expect.objectContaining({ name: "axon_compare_clouds" }),
          expect.objectContaining({ name: "axon_plan_migration" }),
          expect.objectContaining({ name: "axon_synchronize_evidence" }),
          expect.objectContaining({ name: "axon_estimate_cost" }),
          expect.objectContaining({ name: "axon_export_architecture" }),
        ]),
      },
    });
    expect(getMcpToolDefinitions().map((tool) => tool.name)).not.toContain("shell");
  });

  it("validates tool-call params before running handlers", async () => {
    const tools = createMcpTools(new WorkspaceStore());

    await expect(
      handleMcpJsonRpcRequest(
        {
          jsonrpc: "2.0",
          id: "bad",
          method: "tools/call",
          params: {
            name: "axon_inventory_files",
            arguments: { rootDir: "/tmp/workspace", maxFiles: 0 },
          },
        },
        tools,
      ),
    ).resolves.toMatchObject({
      jsonrpc: "2.0",
      id: "bad",
      error: { code: -32602, message: "Invalid tool arguments" },
    });
  });

  it("calls registered tools and wraps JSON output as MCP text content", async () => {
    const store = new WorkspaceStore();
    store.getOrCreate("/tmp/workspace").architecture = { id: "local-architecture" };
    const tools = createMcpTools(store);

    const response = await handleMcpJsonRpcRequest(
      {
        jsonrpc: "2.0",
        id: "call",
        method: "tools/call",
        params: { name: "axon_get_architecture", arguments: { rootDir: "/tmp/workspace" } },
      },
      tools,
    );

    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: "call",
      result: {
        isError: false,
        content: [expect.objectContaining({ type: "text" })],
      },
    });
    expect(JSON.stringify(response)).toContain("local-architecture");
  });

  it("serves newline-delimited JSON-RPC over stdio", async () => {
    const input = Readable.from([
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
      "\n",
      JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      "\n",
    ]);
    const chunks: string[] = [];

    await runMcpStdioServer(input, { write: (chunk: string) => chunks.push(chunk) });

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toContain('"id":1');
    expect(chunks[1]).toContain("axon_inspect_workspace");
  });

  it("prints CLI help without starting a listener", async () => {
    const chunks: string[] = [];

    await expect(
      runCli(["--help"], { stdout: { write: (chunk: string) => chunks.push(chunk) } }),
    ).resolves.toBe(0);

    expect(chunks.join("")).toContain("axon-mcp --stdio");
    expect(chunks.join("")).toContain("axon-mcp status");
    expect(chunks.join("")).toContain("axon-mcp simulate");
  });

  it("returns a non-zero exit code for unsupported CLI flags", async () => {
    const chunks: string[] = [];

    await expect(
      runCli(["unknown-command"], {
        stderr: { write: (chunk: string) => chunks.push(chunk) },
      }),
    ).resolves.toBe(2);

    expect(chunks.join("")).toContain("Unsupported axon-mcp command");
  });

  it("prints machine-readable CLI status", async () => {
    const chunks: string[] = [];

    await expect(
      runCli(["status", "--json"], { stdout: { write: (chunk: string) => chunks.push(chunk) } }),
    ).resolves.toBe(0);

    expect(JSON.parse(chunks.join(""))).toMatchObject({
      mode: "local",
      transport: "stdio",
      networkListener: false,
    });
  });

  it("persists normalized workspace state when a CLI state file is provided", async () => {
    const root = mkdtempSync(join(tmpdir(), "axon-mcp-root-"));
    const stateDir = mkdtempSync(join(tmpdir(), "axon-mcp-state-"));
    const stateFile = join(stateDir, "mcp-state.json");
    const seededStore = new WorkspaceStore();
    seededStore.getOrCreate(root).architecture = { id: "local-architecture" };
    const firstChunks: string[] = [];
    const secondChunks: string[] = [];

    await expect(
      runCli(["status", "--state-file", stateFile, "--json"], {
        store: seededStore,
        stdout: { write: (chunk: string) => firstChunks.push(chunk) },
      }),
    ).resolves.toBe(0);

    await expect(
      runCli(["status", "--state-file", stateFile, "--json"], {
        stdout: { write: (chunk: string) => secondChunks.push(chunk) },
      }),
    ).resolves.toBe(0);

    expect(JSON.parse(firstChunks.join(""))).toMatchObject({ workspaceCount: 1 });
    expect(JSON.parse(secondChunks.join(""))).toMatchObject({ workspaceCount: 1 });
    expect(statSync(stateFile).mode & 0o777).toBe(0o600);
  });

  it("prints registered CLI tools", async () => {
    const chunks: string[] = [];

    await expect(
      runCli(["tools"], { stdout: { write: (chunk: string) => chunks.push(chunk) } }),
    ).resolves.toBe(0);

    expect(chunks.join("")).toContain("axon_inspect_workspace");
    expect(chunks.join("")).not.toContain("shell");
  });

  it("runs a safe local CLI inspect command through the tool registry", async () => {
    const root = mkdtempSync(join(tmpdir(), "axon-mcp-cli-"));
    const chunks: string[] = [];

    await expect(
      runCli(["inspect", "--root", root, "--json"], {
        stdout: { write: (chunk: string) => chunks.push(chunk) },
      }),
    ).resolves.toBe(0);

    expect(JSON.parse(chunks.join(""))).toMatchObject({
      version: MCP_SERVER_VERSION,
      provenance: "locally-observed",
      workspace: {
        fileCount: 0,
      },
    });
  });

  it("reports doctor checks without unsafe capabilities", async () => {
    const chunks: string[] = [];

    await expect(
      runCli(["doctor", "--json"], { stdout: { write: (chunk: string) => chunks.push(chunk) } }),
    ).resolves.toBe(0);

    expect(JSON.parse(chunks.join(""))).toMatchObject({
      checks: expect.arrayContaining([
        expect.objectContaining({
          id: "unsafeCapabilities",
          status: "passing",
        }),
      ]),
    });
  });
});
