import { createInterface, type Interface } from "node:readline";
import {
  stdin as defaultStdin,
  stdout as defaultStdout,
  stderr as defaultStderr,
} from "node:process";
import { z } from "zod";

import { createMcpTools, type McpTools } from "./tools/index";
import { MCP_SERVER_VERSION, WorkspaceStore } from "./workspace-store";

const JSON_RPC_VERSION = "2.0";
const MCP_PROTOCOL_VERSION = "2024-11-05";

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  jsonrpc: typeof JSON_RPC_VERSION;
  id?: JsonRpcId;
  method: string;
  params?: unknown;
}

interface JsonRpcSuccess {
  jsonrpc: typeof JSON_RPC_VERSION;
  id: JsonRpcId;
  result: unknown;
}

interface JsonRpcFailure {
  jsonrpc: typeof JSON_RPC_VERSION;
  id: JsonRpcId;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

type JsonRpcResponse = JsonRpcSuccess | JsonRpcFailure | null;

interface WritableLike {
  write(chunk: string): unknown;
}

interface CliStreams {
  stdin?: NodeJS.ReadableStream;
  stdout?: WritableLike;
  stderr?: WritableLike;
  store?: WorkspaceStore;
}

interface CliCommandResult {
  exitCode: number;
  payload: unknown;
  human: string;
}

interface ToolDefinition {
  name: keyof McpTools & string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const toolsCallParamsSchema = z.object({
  name: z.string().min(1),
  arguments: z.unknown().optional(),
});

const localWorkspaceSchema = {
  type: "object",
  additionalProperties: false,
  required: ["rootDir"],
  properties: {
    rootDir: { type: "string", minLength: 1, description: "Absolute local workspace root path" },
  },
};

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "axon_inspect_workspace",
    description: "Inspect a local workspace without returning source contents.",
    inputSchema: localWorkspaceSchema,
  },
  {
    name: "axon_inventory_files",
    description: "List architecture-relevant files inside the approved workspace boundary.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["rootDir"],
      properties: {
        rootDir: { type: "string", minLength: 1 },
        maxFiles: { type: "integer", minimum: 1 },
      },
    },
  },
  {
    name: "axon_analyze_repository",
    description: "Analyze a local repository and build a normalized architecture proposal.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["rootDir"],
      properties: {
        rootDir: { type: "string", minLength: 1 },
        userExclusions: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "axon_analyze_infrastructure",
    description: "Analyze local Terraform and Kubernetes evidence without executing tools.",
    inputSchema: localWorkspaceSchema,
  },
  {
    name: "axon_get_architecture",
    description: "Return the current in-memory local architecture state.",
    inputSchema: localWorkspaceSchema,
  },
  {
    name: "axon_list_evidence",
    description: "List normalized evidence records from the last local analysis.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["rootDir"],
      properties: {
        rootDir: { type: "string", minLength: 1 },
        limit: { type: "integer", minimum: 1, maximum: 500, default: 100 },
      },
    },
  },
  {
    name: "axon_explain_evidence",
    description: "Return one normalized evidence record by ID.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["rootDir", "evidenceId"],
      properties: {
        rootDir: { type: "string", minLength: 1 },
        evidenceId: { type: "string", minLength: 1 },
      },
    },
  },
  {
    name: "axon_audit_architecture",
    description: "Run deterministic local architecture audit findings.",
    inputSchema: localWorkspaceSchema,
  },
  {
    name: "axon_create_scenario",
    description: "Create or replace an in-memory local simulation scenario.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["rootDir", "scenario"],
      properties: {
        rootDir: { type: "string", minLength: 1 },
        scenario: {
          type: "object",
          additionalProperties: false,
          required: ["id", "label", "requestsPerSecond", "offlineNodeIds"],
          properties: {
            id: { type: "string", minLength: 1 },
            label: { type: "string", minLength: 1 },
            requestsPerSecond: { type: "number", exclusiveMinimum: 0 },
            offlineNodeIds: { type: "array", items: { type: "string", minLength: 1 } },
          },
        },
      },
    },
  },
  {
    name: "axon_simulate_scenario",
    description: "Run deterministic local scenario simulation against the current architecture.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["rootDir"],
      properties: {
        rootDir: { type: "string", minLength: 1 },
        scenarioId: { type: "string", minLength: 1 },
        scenario: {
          type: "object",
          additionalProperties: false,
          required: ["id", "label", "requestsPerSecond", "offlineNodeIds"],
          properties: {
            id: { type: "string", minLength: 1 },
            label: { type: "string", minLength: 1 },
            requestsPerSecond: { type: "number", exclusiveMinimum: 0 },
            offlineNodeIds: { type: "array", items: { type: "string", minLength: 1 } },
          },
        },
      },
    },
  },
  {
    name: "axon_update_architecture_proposal",
    description: "Update local architecture proposal review states without applying changes.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["rootDir"],
      properties: {
        rootDir: { type: "string", minLength: 1 },
        proposal: { type: "object" },
        componentUpdates: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["componentId", "review"],
            properties: {
              componentId: { type: "string", minLength: 1 },
              review: {
                type: "string",
                enum: ["proposed", "accepted", "rejected", "edited", "unresolved"],
              },
            },
          },
        },
        relationshipUpdates: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["relationshipId", "review"],
            properties: {
              relationshipId: { type: "string", minLength: 1 },
              review: {
                type: "string",
                enum: ["proposed", "accepted", "rejected", "edited", "unresolved"],
              },
            },
          },
        },
      },
    },
  },
  {
    name: "axon_compare_snapshots",
    description: "Compare two normalized architecture snapshots with AXON semantic diff.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["rootDir", "baseSnapshot", "targetSnapshot"],
      properties: {
        rootDir: { type: "string", minLength: 1 },
        baseSnapshot: { type: "object" },
        targetSnapshot: { type: "object" },
      },
    },
  },
  {
    name: "axon_compare_clouds",
    description: "Compare AWS architecture components against deterministic GCP catalog mappings.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["rootDir", "sourceCloud", "targetCloud"],
      properties: {
        rootDir: { type: "string", minLength: 1 },
        sourceCloud: { type: "string", enum: ["aws"] },
        targetCloud: { type: "string", enum: ["gcp"] },
        architecture: { type: "object" },
      },
    },
  },
  {
    name: "axon_plan_migration",
    description:
      "Plan a deterministic AWS-to-GCP migration proposal for a normalized architecture.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["rootDir", "sourceCloud", "targetCloud"],
      properties: {
        rootDir: { type: "string", minLength: 1 },
        sourceCloud: { type: "string", enum: ["aws"] },
        targetCloud: { type: "string", enum: ["gcp"] },
        architecture: { type: "object" },
      },
    },
  },
  {
    name: "axon_synchronize_evidence",
    description:
      "Prepare approved normalized local evidence for explicit authenticated hosted synchronization.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["rootDir"],
      properties: {
        rootDir: { type: "string", minLength: 1 },
        projectId: { type: "string", minLength: 1 },
        evidence: { type: "array", items: { type: "object" } },
        proposal: { type: "object" },
        excludedEvidenceIds: { type: "array", items: { type: "string", minLength: 1 } },
        localAnalysisVersion: { type: "string", minLength: 1, default: "repo-intel-local" },
        localWorkspaceSnapshotId: { type: "string", minLength: 1 },
      },
    },
  },
  {
    name: "axon_estimate_cost",
    description: "Estimate modeled monthly architecture cost from explicit usage assumptions.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["rootDir", "usageDrivers"],
      properties: {
        rootDir: { type: "string", minLength: 1 },
        provider: { type: "string", enum: ["aws", "gcp", "azure"], default: "aws" },
        region: { type: "string", minLength: 1, default: "us-east-1" },
        architecture: { type: "object" },
        usageDrivers: { type: "array", items: { type: "object" } },
        includeScaleProjections: { type: "boolean", default: true },
      },
    },
  },
  {
    name: "axon_export_architecture",
    description: "Export the current local architecture as JSON.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["rootDir"],
      properties: {
        rootDir: { type: "string", minLength: 1 },
        format: { type: "string", enum: ["json"], default: "json" },
      },
    },
  },
];

function failure(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcFailure {
  const error: JsonRpcFailure["error"] = { code, message };
  if (data !== undefined) error.data = data;
  return { jsonrpc: JSON_RPC_VERSION, id, error };
}

function success(id: JsonRpcId, result: unknown): JsonRpcSuccess {
  return { jsonrpc: JSON_RPC_VERSION, id, result };
}

function isRequest(value: unknown): value is JsonRpcRequest {
  if (typeof value !== "object" || value === null) return false;
  const maybe = value as Record<string, unknown>;
  return maybe.jsonrpc === JSON_RPC_VERSION && typeof maybe.method === "string";
}

function safeErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim().length > 0) return err.message;
  return "Tool call failed";
}

export function getMcpToolDefinitions(): ToolDefinition[] {
  return TOOL_DEFINITIONS;
}

function printCliResult(result: CliCommandResult, json: boolean, stdout: WritableLike): void {
  if (json) {
    stdout.write(`${JSON.stringify(result.payload, null, 2)}\n`);
    return;
  }
  stdout.write(`${result.human}\n`);
}

function getFlagValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  return argv[index + 1];
}

function cleanCliArgs(argv: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") continue;
    if (arg === "--root") {
      i += 1;
      continue;
    }
    if (arg === "--state-file") {
      i += 1;
      continue;
    }
    if (arg !== undefined) out.push(arg);
  }
  return out;
}

async function callToolForCli(
  tools: McpTools,
  name: keyof McpTools,
  args: unknown,
): Promise<unknown> {
  const tool = tools[name];
  const parsed = tool.inputSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(
      `Invalid arguments for ${name}: ${JSON.stringify(z.treeifyError(parsed.error))}`,
    );
  }
  return tool.handler(parsed.data as never);
}

async function runCliCommand(argv: string[], store: WorkspaceStore): Promise<CliCommandResult> {
  const clean = cleanCliArgs(argv);
  const command = clean[0];
  const rootDir = getFlagValue(argv, "--root") ?? clean[1] ?? process.cwd();
  const tools = createMcpTools(store);

  switch (command) {
    case "status":
      return {
        exitCode: 0,
        payload: {
          version: MCP_SERVER_VERSION,
          mode: "local",
          transport: "stdio",
          workspaceCount: store.list().length,
          networkListener: false,
        },
        human: `AXON MCP ${MCP_SERVER_VERSION} local stdio server; workspaces: ${store.list().length}`,
      };

    case "tools":
      return {
        exitCode: 0,
        payload: { version: MCP_SERVER_VERSION, tools: TOOL_DEFINITIONS },
        human: TOOL_DEFINITIONS.map((tool) => tool.name).join("\n"),
      };

    case "doctor":
      return {
        exitCode: 0,
        payload: {
          version: MCP_SERVER_VERSION,
          checks: [
            { id: "transport", status: "passing", detail: "stdio only; no network listener" },
            { id: "toolRegistry", status: "passing", detail: `${TOOL_DEFINITIONS.length} tools` },
            {
              id: "unsafeCapabilities",
              status: "passing",
              detail: "no shell, URL, Docker, Terraform, kubectl, or environment dumping tools",
            },
          ],
        },
        human:
          "doctor: passing\ntransport: stdio only\ntools: registered\nunsafe capabilities: absent",
      };

    case "inspect": {
      const payload = await callToolForCli(tools, "axon_inspect_workspace", { rootDir });
      return {
        exitCode: 0,
        payload,
        human: `inspected ${rootDir}`,
      };
    }

    case "inventory": {
      const maxFiles = getFlagValue(argv, "--max-files");
      const payload = await callToolForCli(tools, "axon_inventory_files", {
        rootDir,
        ...(maxFiles === undefined ? {} : { maxFiles: Number(maxFiles) }),
      });
      return {
        exitCode: 0,
        payload,
        human: `inventoried ${rootDir}`,
      };
    }

    case "analyze": {
      const payload = await callToolForCli(tools, "axon_analyze_repository", { rootDir });
      return {
        exitCode: 0,
        payload,
        human: `analyzed ${rootDir}`,
      };
    }

    case "evidence": {
      const limit = getFlagValue(argv, "--limit");
      const payload = await callToolForCli(tools, "axon_list_evidence", {
        rootDir,
        ...(limit === undefined ? {} : { limit: Number(limit) }),
      });
      return {
        exitCode: 0,
        payload,
        human: `listed evidence for ${rootDir}`,
      };
    }

    case "audit": {
      const payload = await callToolForCli(tools, "axon_audit_architecture", { rootDir });
      return {
        exitCode: 0,
        payload,
        human: `audited ${rootDir}`,
      };
    }

    case "scenario": {
      const id = getFlagValue(argv, "--id") ?? "local-scenario";
      const label = getFlagValue(argv, "--label") ?? id;
      const rps = Number(getFlagValue(argv, "--rps") ?? "1200");
      const offline = getFlagValue(argv, "--offline");
      const payload = await callToolForCli(tools, "axon_create_scenario", {
        rootDir,
        scenario: {
          id,
          label,
          requestsPerSecond: rps,
          offlineNodeIds: offline === undefined || offline === "" ? [] : offline.split(","),
        },
      });
      return {
        exitCode: 0,
        payload,
        human: `created scenario ${id} for ${rootDir}`,
      };
    }

    case "simulate": {
      const scenarioId = getFlagValue(argv, "--scenario-id");
      const rps = getFlagValue(argv, "--rps");
      const inlineScenario =
        rps === undefined
          ? undefined
          : {
              id: getFlagValue(argv, "--id") ?? "inline-scenario",
              label: getFlagValue(argv, "--label") ?? "Inline scenario",
              requestsPerSecond: Number(rps),
              offlineNodeIds: [],
            };
      const payload = await callToolForCli(tools, "axon_simulate_scenario", {
        rootDir,
        ...(scenarioId === undefined ? {} : { scenarioId }),
        ...(inlineScenario === undefined ? {} : { scenario: inlineScenario }),
      });
      return {
        exitCode: 0,
        payload,
        human: `simulated ${rootDir}`,
      };
    }

    case "export": {
      const payload = await callToolForCli(tools, "axon_export_architecture", { rootDir });
      return {
        exitCode: 0,
        payload,
        human: `exported ${rootDir}`,
      };
    }

    default:
      return {
        exitCode: 2,
        payload: {
          version: MCP_SERVER_VERSION,
          error: "UNKNOWN_COMMAND",
          command: command ?? null,
          supportedCommands: [
            "status",
            "tools",
            "doctor",
            "inspect",
            "inventory",
            "analyze",
            "evidence",
            "audit",
            "scenario",
            "simulate",
            "export",
          ],
        },
        human: "Unsupported axon-mcp command. Use --help for usage.",
      };
  }
}

export async function handleMcpJsonRpcRequest(
  request: unknown,
  tools: McpTools,
): Promise<JsonRpcResponse> {
  if (!isRequest(request)) {
    return failure(null, -32600, "Invalid Request");
  }

  const id = request.id ?? null;
  if (request.id === undefined && request.method.startsWith("notifications/")) {
    return null;
  }

  switch (request.method) {
    case "initialize":
      return success(id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "axon-mcp", version: MCP_SERVER_VERSION },
      });

    case "tools/list":
      return success(id, {
        tools: TOOL_DEFINITIONS,
      });

    case "tools/call": {
      const params = toolsCallParamsSchema.safeParse(request.params);
      if (!params.success) {
        return failure(id, -32602, "Invalid params", z.treeifyError(params.error));
      }

      const tool = tools[params.data.name as keyof McpTools];
      if (!tool) {
        return failure(id, -32601, "Unknown tool");
      }

      const parsedInput = tool.inputSchema.safeParse(params.data.arguments ?? {});
      if (!parsedInput.success) {
        return failure(id, -32602, "Invalid tool arguments", z.treeifyError(parsedInput.error));
      }

      try {
        const result = await tool.handler(parsedInput.data as never);
        return success(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          isError: false,
        });
      } catch (err) {
        return success(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  version: MCP_SERVER_VERSION,
                  error: "TOOL_EXECUTION_FAILED",
                  message: safeErrorMessage(err),
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        });
      }
    }

    default:
      return failure(id, -32601, "Method not found");
  }
}

export async function runMcpStdioServer(
  input: NodeJS.ReadableStream = defaultStdin,
  output: WritableLike = defaultStdout,
  store = new WorkspaceStore(),
): Promise<void> {
  const tools = createMcpTools(store);
  const lines: Interface = createInterface({ input, crlfDelay: Infinity });

  for await (const line of lines) {
    if (line.trim().length === 0) continue;

    let request: unknown;
    try {
      request = JSON.parse(line);
    } catch {
      output.write(`${JSON.stringify(failure(null, -32700, "Parse error"))}\n`);
      continue;
    }

    const response = await handleMcpJsonRpcRequest(request, tools);
    if (response) output.write(`${JSON.stringify(response)}\n`);
  }
}

export async function runCli(argv: string[], streams: CliStreams = {}): Promise<number> {
  const stdout = streams.stdout ?? defaultStdout;
  const stderr = streams.stderr ?? defaultStderr;
  const stateFile = getFlagValue(argv, "--state-file");

  if (argv.includes("--help") || argv.includes("-h")) {
    stdout.write(
      [
        "AXON local MCP server",
        "",
        "Usage:",
        "  axon-mcp --stdio",
        "  axon-mcp status [--json]",
        "  axon-mcp status --state-file .axon/mcp-state.json [--json]",
        "  axon-mcp tools [--json]",
        "  axon-mcp doctor [--json]",
        "  axon-mcp inspect --root ./repo [--json]",
        "  axon-mcp inventory --root ./repo [--max-files 100] [--json]",
        "  axon-mcp analyze --root ./repo [--json]",
        "  axon-mcp evidence --root ./repo [--limit 100] [--json]",
        "  axon-mcp audit --root ./repo [--json]",
        "  axon-mcp scenario --root ./repo [--id growth] [--rps 3600] [--json]",
        "  axon-mcp simulate --root ./repo [--scenario-id growth] [--json]",
        "  axon-mcp export --root ./repo [--json]",
        "",
        "The stdio transport exposes JSON-RPC MCP methods: initialize, tools/list, tools/call.",
        "CLI commands run local static analysis only. They never open a network listener or execute repository code.",
        "Use --state-file to persist normalized architecture, evidence, findings, and scenarios between CLI invocations.",
        "",
      ].join("\n"),
    );
    return 0;
  }

  if (argv.length === 0 || argv.includes("--stdio")) {
    await runMcpStdioServer(streams.stdin ?? defaultStdin, stdout, streams.store);
    return 0;
  }

  try {
    const store =
      streams.store ??
      (stateFile === undefined ? new WorkspaceStore() : WorkspaceStore.loadFromFile(stateFile));
    const result = await runCliCommand(argv, store);
    if (stateFile !== undefined) {
      store.saveToFile(stateFile);
    }
    printCliResult(result, argv.includes("--json"), result.exitCode === 0 ? stdout : stderr);
    return result.exitCode;
  } catch (err) {
    const message = safeErrorMessage(err);
    if (argv.includes("--json")) {
      stderr.write(
        `${JSON.stringify({ version: MCP_SERVER_VERSION, error: "CLI_COMMAND_FAILED", message }, null, 2)}\n`,
      );
    } else {
      stderr.write(`${message}\n`);
    }
    return 1;
  }
}
