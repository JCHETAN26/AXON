import { z } from "zod";
import {
  WorkspaceBoundary,
  LocalAnalyzer,
  MIGRATION_CATALOG_VERSION,
  ArchitectureProposalSchema,
  RepositoryEvidenceSchema,
  ReviewStateSchema,
  getAwsToGcpMapping,
  transformAwsToGcp,
  type ArchitectureProposal,
  type RepositoryEvidence,
  type WorkspaceBoundaryConfig,
} from "@axon/repo-intel";
import { runAudit } from "@axon/architecture-audit";
import { runSimulation, ScenarioSchema, type Scenario } from "@axon/architecture-simulation";
import {
  estimateArchitectureCost,
  estimateArchitectureCostAtScale,
  UsageDriverSchema,
} from "@axon/architecture-cost";
import {
  ARCHITECTURE_SCHEMA_VERSION,
  ArchitectureDocumentSchema,
  type ArchitectureDocument,
  ArchitectureSnapshotSchema,
  computeSemanticDocumentDiff,
} from "@axon/diagram-schema";
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

export const CreateScenarioInput = z.object({
  rootDir: z.string().min(1),
  scenario: ScenarioSchema,
});

export const SimulateScenarioInput = z.object({
  rootDir: z.string().min(1),
  scenarioId: z.string().min(1).optional(),
  scenario: ScenarioSchema.optional(),
});

export const CompareSnapshotsInput = z.object({
  rootDir: z.string().min(1),
  baseSnapshot: ArchitectureSnapshotSchema,
  targetSnapshot: ArchitectureSnapshotSchema,
});

export const PlanMigrationInput = z.object({
  rootDir: z.string().min(1),
  sourceCloud: z.enum(["aws"]),
  targetCloud: z.enum(["gcp"]),
  architecture: ArchitectureDocumentSchema.optional(),
});

export const CompareCloudsInput = z.object({
  rootDir: z.string().min(1),
  sourceCloud: z.enum(["aws"]),
  targetCloud: z.enum(["gcp"]),
  architecture: ArchitectureDocumentSchema.optional(),
});

const ProposalReviewUpdateSchema = z.object({
  review: ReviewStateSchema,
});

const ComponentReviewUpdateSchema = ProposalReviewUpdateSchema.extend({
  componentId: z.string().min(1),
});

const RelationshipReviewUpdateSchema = ProposalReviewUpdateSchema.extend({
  relationshipId: z.string().min(1),
});

export const UpdateArchitectureProposalInput = z.object({
  rootDir: z.string().min(1),
  proposal: ArchitectureProposalSchema.optional(),
  componentUpdates: z.array(ComponentReviewUpdateSchema).optional().default([]),
  relationshipUpdates: z.array(RelationshipReviewUpdateSchema).optional().default([]),
});

export const SynchronizeEvidenceInput = z.object({
  rootDir: z.string().min(1),
  projectId: z.string().min(1).optional(),
  evidence: z.array(RepositoryEvidenceSchema).optional(),
  proposal: ArchitectureProposalSchema.optional(),
  excludedEvidenceIds: z.array(z.string().min(1)).optional().default([]),
  localAnalysisVersion: z.string().min(1).optional().default("repo-intel-local"),
  localWorkspaceSnapshotId: z.string().min(1).optional(),
});

export const EstimateCostInput = z.object({
  rootDir: z.string().min(1),
  provider: z.enum(["aws", "gcp", "azure"]).default("aws"),
  region: z.string().min(1).default("us-east-1"),
  architecture: ArchitectureDocumentSchema.optional(),
  usageDrivers: z.array(UsageDriverSchema),
  includeScaleProjections: z.boolean().optional().default(true),
});

export const ExportArchitectureInput = z.object({
  rootDir: z.string().min(1),
  format: z.enum(["json"]).optional().default("json"),
});

function proposalToDocument(proposal: ArchitectureProposal, rootDir: string): ArchitectureDocument {
  const now = proposal.createdAt;
  return {
    schemaVersion: ARCHITECTURE_SCHEMA_VERSION,
    id: `local-${proposal.sourceCommitSha}`,
    projectId: `local-${rootDir}`,
    name: "Local architecture proposal",
    description: `Generated from ${proposal.sourceRepositoryFullName}`,
    createdAt: now,
    updatedAt: now,
    source: {
      kind: "imported",
      label: proposal.sourceRepositoryFullName,
    },
    assumptions: [],
    nodes: proposal.components.map((component, index) => ({
      id: component.id,
      name: component.name,
      category: component.category,
      meta: component.technology,
      position: {
        x: 160 + (index % 4) * 220,
        y: 140 + Math.floor(index / 4) * 140,
      },
    })),
    edges: proposal.relationships.map((relationship) => ({
      id: relationship.id,
      source: relationship.source,
      target: relationship.target,
      kind: relationship.kind,
    })),
    groups: [],
    metadata: {
      generator: "axon-mcp",
      notes:
        "Derived from a local ArchitectureProposal for deterministic local scenario simulation.",
    },
  };
}

function readArchitectureDocument(
  stateArchitecture: unknown,
  rootDir: string,
): ArchitectureDocument | null {
  if (typeof stateArchitecture !== "object" || stateArchitecture === null) return null;
  const candidate = stateArchitecture as Partial<ArchitectureDocument> &
    Partial<ArchitectureProposal>;
  if (candidate.schemaVersion === ARCHITECTURE_SCHEMA_VERSION && Array.isArray(candidate.nodes)) {
    return candidate as ArchitectureDocument;
  }
  if (Array.isArray(candidate.components) && Array.isArray(candidate.relationships)) {
    return proposalToDocument(candidate as ArchitectureProposal, rootDir);
  }
  return null;
}

function readArchitectureProposal(stateArchitecture: unknown): ArchitectureProposal | null {
  const parsed = ArchitectureProposalSchema.safeParse(stateArchitecture);
  return parsed.success ? parsed.data : null;
}

function readRepositoryEvidence(stateEvidence: unknown[]): RepositoryEvidence[] {
  return stateEvidence.flatMap((item) => {
    const parsed = RepositoryEvidenceSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

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

    axon_create_scenario: {
      description: "Create or replace a deterministic local simulation scenario",
      inputSchema: CreateScenarioInput,
      version: MCP_SERVER_VERSION,
      async handler(input: z.infer<typeof CreateScenarioInput>) {
        const state = store.getOrCreate(input.rootDir);
        state.scenarios.set(input.scenario.id, input.scenario);

        return {
          version: MCP_SERVER_VERSION,
          provenance: "locally-observed",
          confidence: "confirmed",
          stored: true,
          scenario: input.scenario,
          scenarioCount: state.scenarios.size,
          limitations: [
            "Scenario persistence is in-memory for this local MCP process; durable fully-local storage is not complete.",
          ],
        };
      },
    },

    axon_simulate_scenario: {
      description:
        "Run deterministic local traffic/failure simulation for a stored or inline scenario",
      inputSchema: SimulateScenarioInput,
      version: MCP_SERVER_VERSION,
      async handler(input: z.infer<typeof SimulateScenarioInput>) {
        const state = store.get(input.rootDir);
        const document = readArchitectureDocument(state?.architecture, input.rootDir);

        if (!state?.architecture || !document) {
          return {
            version: MCP_SERVER_VERSION,
            provenance: "locally-observed",
            simulated: false,
            message: "No simulatable architecture analyzed yet. Run axon_analyze_repository first.",
          };
        }

        const scenario =
          input.scenario ??
          (input.scenarioId
            ? (state.scenarios.get(input.scenarioId) as Scenario | undefined)
            : undefined);

        if (!scenario) {
          return {
            version: MCP_SERVER_VERSION,
            provenance: "locally-observed",
            simulated: false,
            message:
              "No scenario was provided or found. Run axon_create_scenario or pass an inline scenario.",
          };
        }

        const result = runSimulation({ document, scenario });
        state.scenarios.set(scenario.id, scenario);

        return {
          version: MCP_SERVER_VERSION,
          provenance: "derived",
          confidence: "medium",
          simulated: true,
          scenario,
          result,
          limitations: [
            "Simulation is deterministic and model-based; it is not a production benchmark.",
            "Scenario persistence is in-memory for this local MCP process; durable fully-local storage is not complete.",
          ],
        };
      },
    },

    axon_update_architecture_proposal: {
      description: "Update local ArchitectureProposal review states without applying changes",
      inputSchema: UpdateArchitectureProposalInput,
      version: MCP_SERVER_VERSION,
      async handler(input: z.infer<typeof UpdateArchitectureProposalInput>) {
        const state = store.getOrCreate(input.rootDir);
        const proposal = input.proposal ?? readArchitectureProposal(state.architecture);

        if (!proposal) {
          return {
            version: MCP_SERVER_VERSION,
            provenance: "locally-observed",
            updated: false,
            message:
              "No ArchitectureProposal was provided or analyzed. Pass proposal or run axon_analyze_repository first.",
          };
        }

        const componentUpdates = new Map(
          input.componentUpdates.map((update) => [update.componentId, update.review]),
        );
        const relationshipUpdates = new Map(
          input.relationshipUpdates.map((update) => [update.relationshipId, update.review]),
        );

        let updatedComponents = 0;
        let updatedRelationships = 0;
        const seenComponentIds = new Set<string>();
        const seenRelationshipIds = new Set<string>();

        const updatedProposal: ArchitectureProposal = {
          ...proposal,
          components: proposal.components.map((component) => {
            const review = componentUpdates.get(component.id);
            if (!review) return component;
            seenComponentIds.add(component.id);
            updatedComponents += review === component.review ? 0 : 1;
            return { ...component, review };
          }),
          relationships: proposal.relationships.map((relationship) => {
            const review = relationshipUpdates.get(relationship.id);
            if (!review) return relationship;
            seenRelationshipIds.add(relationship.id);
            updatedRelationships += review === relationship.review ? 0 : 1;
            return { ...relationship, review };
          }),
        };

        state.architecture = updatedProposal;

        return {
          version: MCP_SERVER_VERSION,
          provenance: "user-confirmed",
          confidence: "confirmed",
          updated: true,
          proposal: updatedProposal,
          summary: {
            updatedComponents,
            updatedRelationships,
            missingComponentIds: [...componentUpdates.keys()].filter(
              (componentId) => !seenComponentIds.has(componentId),
            ),
            missingRelationshipIds: [...relationshipUpdates.keys()].filter(
              (relationshipId) => !seenRelationshipIds.has(relationshipId),
            ),
          },
          limitations: [
            "This updates local proposal review state only; it does not apply the proposal to a project document or hosted database.",
          ],
        };
      },
    },

    axon_compare_snapshots: {
      description: "Compare two provided architecture snapshots using AXON semantic diff",
      inputSchema: CompareSnapshotsInput,
      version: MCP_SERVER_VERSION,
      async handler(input: z.infer<typeof CompareSnapshotsInput>) {
        const diff = computeSemanticDocumentDiff(
          input.baseSnapshot.payload,
          input.targetSnapshot.payload,
        );

        return {
          version: MCP_SERVER_VERSION,
          provenance: "derived",
          confidence: "confirmed",
          workspace: { rootDir: input.rootDir },
          baseSnapshot: {
            id: input.baseSnapshot.id,
            documentVersion: input.baseSnapshot.documentVersion,
            semanticHash: input.baseSnapshot.semanticHash,
            createdAt: input.baseSnapshot.createdAt,
          },
          targetSnapshot: {
            id: input.targetSnapshot.id,
            documentVersion: input.targetSnapshot.documentVersion,
            semanticHash: input.targetSnapshot.semanticHash,
            createdAt: input.targetSnapshot.createdAt,
          },
          diff,
          limitations: [
            "This compares normalized architecture snapshots supplied to the MCP call; it does not read snapshot files from disk.",
          ],
        };
      },
    },

    axon_compare_clouds: {
      description: "Compare AWS architecture components against deterministic GCP catalog mappings",
      inputSchema: CompareCloudsInput,
      version: MCP_SERVER_VERSION,
      async handler(input: z.infer<typeof CompareCloudsInput>) {
        const state = store.get(input.rootDir);
        const document =
          input.architecture ?? readArchitectureDocument(state?.architecture, input.rootDir);

        if (!document) {
          return {
            version: MCP_SERVER_VERSION,
            provenance: "locally-observed",
            compared: false,
            message:
              "No architecture document was provided or analyzed. Pass architecture or run axon_analyze_repository first.",
          };
        }

        const comparisons = document.nodes.map((node) => {
          const sourceTechnology = node.meta ?? node.category;
          const mapping = getAwsToGcpMapping(sourceTechnology);
          return {
            componentId: node.id,
            componentName: node.name,
            sourceTechnology,
            targetTechnology: mapping?.gcpTechnology ?? `gcp_${node.category}`,
            targetProductName: mapping?.gcpProductName ?? "GCP Custom Resource",
            targetCategory: mapping?.gcpCategory ?? node.category,
            equivalenceScore: mapping?.equivalenceScore ?? 0.5,
            confidence: mapping ? "high" : "medium",
            residualRisk:
              mapping?.refactoringNotes ??
              "Uncataloged AWS service requires manual architectural mapping.",
          };
        });

        const averageEquivalenceScore =
          comparisons.length > 0
            ? comparisons.reduce((sum, comparison) => sum + comparison.equivalenceScore, 0) /
              comparisons.length
            : 1;

        return {
          version: MCP_SERVER_VERSION,
          provenance: "derived",
          confidence: "medium",
          compared: true,
          sourceCloud: input.sourceCloud,
          targetCloud: input.targetCloud,
          catalogVersion: MIGRATION_CATALOG_VERSION,
          summary: {
            componentCount: comparisons.length,
            mappedComponentCount: comparisons.filter(
              (comparison) => comparison.targetProductName !== "GCP Custom Resource",
            ).length,
            unmappedComponentCount: comparisons.filter(
              (comparison) => comparison.targetProductName === "GCP Custom Resource",
            ).length,
            averageEquivalenceScore,
          },
          comparisons,
          limitations: [
            "This is a deterministic catalog comparison; it does not query live cloud inventories or prices.",
            "Only AWS-to-GCP component capability comparison is implemented for this MCP tool in Checkpoint 13.",
          ],
        };
      },
    },

    axon_synchronize_evidence: {
      description: "Prepare approved normalized local evidence for explicit hosted synchronization",
      inputSchema: SynchronizeEvidenceInput,
      version: MCP_SERVER_VERSION,
      async handler(input: z.infer<typeof SynchronizeEvidenceInput>) {
        const state = store.get(input.rootDir);
        const evidence = input.evidence ?? readRepositoryEvidence(state?.evidence ?? []);
        const proposal = input.proposal ?? readArchitectureProposal(state?.architecture);

        if (!proposal) {
          return {
            version: MCP_SERVER_VERSION,
            provenance: "locally-observed",
            synchronized: false,
            message:
              "No ArchitectureProposal was provided or analyzed. Pass proposal or run axon_analyze_repository first.",
          };
        }

        const excludedSet = new Set(input.excludedEvidenceIds);
        const manifest = evidence.map((ev) => ({
          evidenceId: ev.id,
          filePath: ev.filePath,
          evidenceType: ev.evidenceType,
          extractor: ev.extractor,
          confidence: ev.confidence,
          technology: ev.fact.technology ?? null,
          category: ev.fact.category ?? null,
          included: !excludedSet.has(ev.id),
          redactionStatus: ev.excerpt ? "redacted-excerpt" : "no-excerpt",
          rawSourceRetained: false,
        }));
        const approvedEvidence = evidence.filter((ev) => !excludedSet.has(ev.id));
        const localWorkspaceSnapshotId = input.localWorkspaceSnapshotId ?? proposal.sourceCommitSha;

        return {
          version: MCP_SERVER_VERSION,
          provenance: "locally-observed",
          confidence: "confirmed",
          synchronized: false,
          readyForHostedSubmission: true,
          projectId: input.projectId ?? null,
          localAnalysisVersion: input.localAnalysisVersion,
          localWorkspaceSnapshotId,
          summary: {
            totalEvidenceCount: evidence.length,
            includedEvidenceCount: approvedEvidence.length,
            excludedEvidenceCount: evidence.length - approvedEvidence.length,
            componentCount: proposal.components.length,
            relationshipCount: proposal.relationships.length,
          },
          reviewManifest: manifest,
          hostedSyncRequest: {
            projectId: input.projectId,
            evidence: approvedEvidence,
            proposal,
            excludedEvidenceIds: input.excludedEvidenceIds,
            localAnalysisVersion: input.localAnalysisVersion,
            localWorkspaceSnapshotId,
          },
          limitations: [
            "This MCP tool prepares an explicit synchronization payload only; it does not call hosted AXON or persist evidence by itself.",
            "Raw source files are not included. Evidence excerpts are limited by the repository-intelligence evidence schema.",
            "A hosted local-agent credential is still required to submit this payload to the authenticated sync API.",
          ],
        };
      },
    },

    axon_estimate_cost: {
      description: "Estimate modeled monthly architecture cost using explicit usage assumptions",
      inputSchema: EstimateCostInput,
      version: MCP_SERVER_VERSION,
      async handler(input: z.infer<typeof EstimateCostInput>) {
        const state = store.get(input.rootDir);
        const document =
          input.architecture ?? readArchitectureDocument(state?.architecture, input.rootDir);

        if (!document) {
          return {
            version: MCP_SERVER_VERSION,
            provenance: "locally-observed",
            estimated: false,
            message:
              "No architecture document was provided or analyzed. Pass architecture or run axon_analyze_repository first.",
          };
        }

        const usageProfile = { drivers: input.usageDrivers };
        const baseline = estimateArchitectureCost({
          document,
          provider: input.provider,
          region: input.region,
          usageProfile,
        });

        return {
          version: MCP_SERVER_VERSION,
          provenance: "derived",
          confidence: baseline.confidence,
          estimated: true,
          baseline,
          scaleProjections: input.includeScaleProjections
            ? estimateArchitectureCostAtScale({
                document,
                provider: input.provider,
                region: input.region,
                usageProfile,
              })
            : null,
          limitations: [
            "This is a modeled monthly estimate, not a provider invoice.",
            "Uses explicit usage assumptions and the configured pricing catalog; taxes, support, discounts, and reserved-use commitments are not included.",
          ],
        };
      },
    },

    axon_plan_migration: {
      description: "Plan a deterministic cloud migration from AWS architecture to GCP proposal",
      inputSchema: PlanMigrationInput,
      version: MCP_SERVER_VERSION,
      async handler(input: z.infer<typeof PlanMigrationInput>) {
        const state = store.get(input.rootDir);
        const document =
          input.architecture ?? readArchitectureDocument(state?.architecture, input.rootDir);

        if (!document) {
          return {
            version: MCP_SERVER_VERSION,
            provenance: "locally-observed",
            planned: false,
            message:
              "No architecture document was provided or analyzed. Pass architecture or run axon_analyze_repository first.",
          };
        }

        const result = transformAwsToGcp(document);

        return {
          version: MCP_SERVER_VERSION,
          provenance: "derived",
          confidence: "medium",
          planned: true,
          sourceCloud: input.sourceCloud,
          targetCloud: input.targetCloud,
          catalogVersion: MIGRATION_CATALOG_VERSION,
          result,
          limitations: [
            "This is a deterministic AWS-to-GCP mapping proposal; it does not create infrastructure or cloud resources.",
            "Only the AWS-to-GCP catalog is implemented for this MCP tool in Checkpoint 13.",
          ],
        };
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
