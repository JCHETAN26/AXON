import { z } from "zod";
import { WorkspaceBoundary, LocalAnalyzer, type WorkspaceBoundaryConfig } from "@axon/repo-intel";
import { runAudit } from "@axon/architecture-audit";
import { MCP_SERVER_VERSION, type WorkspaceStore } from "../workspace-store";

/**
 * MCP Tool definitions for the AXON local analysis server.
 *
 * Each tool has:
 * - A strict Zod input schema
 * - A strict output contract
 * - Version, workspace scope, provenance metadata
 * - Safe error codes (never leaking secrets)
 *
 * Tools that are NOT exposed (per §13.2):
 * - Arbitrary shell execution
 * - Arbitrary file reads
 * - Arbitrary URL fetching
 * - Dependency installation
 * - Git credential extraction
 * - Docker/Terraform/kubectl execution
 * - Cloud credential discovery
 * - Process inspection
 * - Environment-variable dumping
 */

// ─── Tool Schemas ───────────────────────────────────────────────────────

export const InspectWorkspaceInput = z.object({
  rootDir: z.string().min(1).describe("Absolute path to workspace root"),
});

export const InventoryFilesInput = z.object({
  rootDir: z.string().min(1),
  maxFiles: z.number().int().positive().optional(),
});

export const AnalyzeRepositoryInput = z.object({
  rootDir: z.string().min(1),
  userExclusions: z.array(z.string()).optional(),
});

export const AnalyzeInfrastructureInput = z.object({
  rootDir: z.string().min(1),
});

export const GetArchitectureInput = z.object({
  rootDir: z.string().min(1),
});

export const ListEvidenceInput = z.object({
  rootDir: z.string().min(1),
  limit: z.number().int().positive().max(500).optional().default(100),
});

export const ExplainEvidenceInput = z.object({
  rootDir: z.string().min(1),
  evidenceId: z.string().min(1),
});

export const AuditArchitectureInput = z.object({
  rootDir: z.string().min(1),
});

export const ExportArchitectureInput = z.object({
  rootDir: z.string().min(1),
  format: z.enum(["json"]).optional().default("json"),
});

// ─── Tool Implementations ───────────────────────────────────────────────

export function createMcpTools(store: WorkspaceStore) {
  return {
    axon_inspect_workspace: {
      description: "Inspect a local workspace: returns root dir, file counts, and supported types",
      inputSchema: InspectWorkspaceInput,
      version: MCP_SERVER_VERSION,
      async handler(input: z.infer<typeof InspectWorkspaceInput>) {
        const boundary = new WorkspaceBoundary({ rootDir: input.rootDir });
        const inventory = await boundary.inventory();

        return {
          version: MCP_SERVER_VERSION,
          provenance: "locally-observed",
          workspace: {
            rootDir: boundary.rootDir,
            fileCount: inventory.fileCount,
            totalBytes: inventory.totalBytes,
            skippedCount: inventory.skippedCount,
            limitReached: inventory.limitReached,
          },
        };
      },
    },

    axon_inventory_files: {
      description: "List architecture-relevant files within workspace boundary",
      inputSchema: InventoryFilesInput,
      version: MCP_SERVER_VERSION,
      async handler(input: z.infer<typeof InventoryFilesInput>) {
        const boundaryConfig: WorkspaceBoundaryConfig = {
          rootDir: input.rootDir,
        };
        if (input.maxFiles) {
          boundaryConfig.limits = { maxFileCount: input.maxFiles };
        }
        const boundary = new WorkspaceBoundary(boundaryConfig);
        const inventory = await boundary.inventory();

        return {
          version: MCP_SERVER_VERSION,
          provenance: "locally-observed",
          files: inventory.files.map((f) => ({
            path: f.relativePath,
            sizeBytes: f.sizeBytes,
          })),
          fileCount: inventory.fileCount,
          totalBytes: inventory.totalBytes,
        };
      },
    },

    axon_analyze_repository: {
      description: "Run full local repository analysis producing an ArchitectureProposal",
      inputSchema: AnalyzeRepositoryInput,
      version: MCP_SERVER_VERSION,
      async handler(input: z.infer<typeof AnalyzeRepositoryInput>) {
        const boundaryConfig: WorkspaceBoundaryConfig = {
          rootDir: input.rootDir,
        };
        if (input.userExclusions) {
          boundaryConfig.userExclusions = input.userExclusions;
        }
        const boundary = new WorkspaceBoundary(boundaryConfig);
        const analyzer = new LocalAnalyzer({ boundary });
        const result = await analyzer.analyze();

        // Store state
        const state = store.getOrCreate(input.rootDir);
        state.architecture = result.proposal;
        state.evidence = result.evidence;
        state.lastAnalyzedAt = new Date();

        return {
          version: MCP_SERVER_VERSION,
          provenance: "locally-observed",
          confidence: "high",
          proposal: result.proposal,
          evidenceCount: result.evidence.length,
          durationMs: result.durationMs,
          inventory: {
            fileCount: result.inventory.fileCount,
            totalBytes: result.inventory.totalBytes,
          },
        };
      },
    },

    axon_analyze_infrastructure: {
      description: "Analyze Terraform and Kubernetes files only",
      inputSchema: AnalyzeInfrastructureInput,
      version: MCP_SERVER_VERSION,
      async handler(input: z.infer<typeof AnalyzeInfrastructureInput>) {
        const boundary = new WorkspaceBoundary({ rootDir: input.rootDir });
        const analyzer = new LocalAnalyzer({ boundary });
        const result = await analyzer.analyze();

        // Filter to IaC evidence only
        const iacEvidence = result.evidence.filter(
          (ev) => ev.evidenceType === "infrastructure-declaration",
        );

        return {
          version: MCP_SERVER_VERSION,
          provenance: "locally-observed",
          confidence: "high",
          iacEvidenceCount: iacEvidence.length,
          totalEvidenceCount: result.evidence.length,
          durationMs: result.durationMs,
        };
      },
    },

    axon_get_architecture: {
      description: "Get the current local architecture state",
      inputSchema: GetArchitectureInput,
      version: MCP_SERVER_VERSION,
      async handler(input: z.infer<typeof GetArchitectureInput>) {
        const state = store.get(input.rootDir);
        if (!state?.architecture) {
          return {
            version: MCP_SERVER_VERSION,
            provenance: "locally-observed",
            architecture: null,
            message: "No architecture analyzed yet. Run axon_analyze_repository first.",
          };
        }

        return {
          version: MCP_SERVER_VERSION,
          provenance: "locally-observed",
          architecture: state.architecture,
          lastAnalyzedAt: state.lastAnalyzedAt?.toISOString() ?? null,
        };
      },
    },

    axon_list_evidence: {
      description: "List evidence records from the last analysis",
      inputSchema: ListEvidenceInput,
      version: MCP_SERVER_VERSION,
      async handler(input: z.infer<typeof ListEvidenceInput>) {
        const state = store.get(input.rootDir);
        const evidence = state?.evidence ?? [];
        const limited = evidence.slice(0, input.limit);

        return {
          version: MCP_SERVER_VERSION,
          provenance: "locally-observed",
          evidence: limited,
          totalCount: evidence.length,
          returnedCount: limited.length,
        };
      },
    },

    axon_explain_evidence: {
      description: "Explain a specific evidence record by ID",
      inputSchema: ExplainEvidenceInput,
      version: MCP_SERVER_VERSION,
      async handler(input: z.infer<typeof ExplainEvidenceInput>) {
        const state = store.get(input.rootDir);
        const evidence = (state?.evidence ?? []) as { id: string; [key: string]: unknown }[];
        const found = evidence.find((ev) => ev.id === input.evidenceId);

        if (!found) {
          return {
            version: MCP_SERVER_VERSION,
            provenance: "locally-observed",
            found: false,
            message: `Evidence ${input.evidenceId} not found.`,
          };
        }

        return {
          version: MCP_SERVER_VERSION,
          provenance: "locally-observed",
          found: true,
          evidence: found,
        };
      },
    },

    axon_audit_architecture: {
      description: "Run deterministic architecture audit producing findings",
      inputSchema: AuditArchitectureInput,
      version: MCP_SERVER_VERSION,
      async handler(input: z.infer<typeof AuditArchitectureInput>) {
        const state = store.get(input.rootDir);
        if (!state?.architecture) {
          return {
            version: MCP_SERVER_VERSION,
            provenance: "locally-observed",
            findings: [],
            message: "No architecture to audit. Run axon_analyze_repository first.",
          };
        }

        try {
          const findings = runAudit(state.architecture as Parameters<typeof runAudit>[0]);
          state.findings = findings;

          return {
            version: MCP_SERVER_VERSION,
            provenance: "locally-observed",
            confidence: "high",
            findings,
            summary: {
              findingCount: findings.length,
              highSeverityCount: findings.filter((finding) => finding.severity === "high").length,
            },
          };
        } catch (err) {
          return {
            version: MCP_SERVER_VERSION,
            provenance: "locally-observed",
            error: "AUDIT_FAILED",
            message: err instanceof Error ? err.message : "Audit failed",
          };
        }
      },
    },

    axon_export_architecture: {
      description: "Export the current architecture as JSON",
      inputSchema: ExportArchitectureInput,
      version: MCP_SERVER_VERSION,
      async handler(input: z.infer<typeof ExportArchitectureInput>) {
        const state = store.get(input.rootDir);
        if (!state?.architecture) {
          return {
            version: MCP_SERVER_VERSION,
            provenance: "locally-observed",
            exported: false,
            message: "No architecture to export.",
          };
        }

        return {
          version: MCP_SERVER_VERSION,
          provenance: "locally-observed",
          exported: true,
          format: input.format,
          data: state.architecture,
        };
      },
    },
  };
}

export type McpTools = ReturnType<typeof createMcpTools>;
