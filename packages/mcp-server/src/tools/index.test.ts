import { describe, expect, it } from "vitest";
import { type ArchitectureDocument } from "@axon/diagram-schema";

import {
  createMcpTools,
  CompareCloudsInput,
  CompareSnapshotsInput,
  CreateScenarioInput,
  EstimateCostInput,
  InventoryFilesInput,
  PlanMigrationInput,
  SimulateScenarioInput,
  SynchronizeEvidenceInput,
  UpdateArchitectureProposalInput,
} from "./index";
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

  it("validates scenario inputs with strict schemas", () => {
    expect(
      CreateScenarioInput.safeParse({
        rootDir: "/tmp/workspace",
        scenario: {
          id: "growth",
          label: "Growth",
          requestsPerSecond: 3600,
          offlineNodeIds: [],
        },
      }).success,
    ).toBe(true);
    expect(
      SimulateScenarioInput.safeParse({
        rootDir: "/tmp/workspace",
        scenario: {
          id: "bad",
          label: "Bad",
          requestsPerSecond: 0,
          offlineNodeIds: [],
        },
      }).success,
    ).toBe(false);
  });

  it("validates compare snapshot inputs with canonical snapshot schemas", () => {
    expect(
      CompareSnapshotsInput.safeParse({
        rootDir: "/tmp/workspace",
        baseSnapshot: { id: "missing-payload" },
        targetSnapshot: { id: "also-missing-payload" },
      }).success,
    ).toBe(false);
  });

  it("validates migration planning inputs with supported cloud pairs only", () => {
    expect(
      PlanMigrationInput.safeParse({
        rootDir: "/tmp/workspace",
        sourceCloud: "aws",
        targetCloud: "gcp",
      }).success,
    ).toBe(true);
    expect(
      PlanMigrationInput.safeParse({
        rootDir: "/tmp/workspace",
        sourceCloud: "gcp",
        targetCloud: "aws",
      }).success,
    ).toBe(false);
  });

  it("validates cloud comparison inputs with supported cloud pairs only", () => {
    expect(
      CompareCloudsInput.safeParse({
        rootDir: "/tmp/workspace",
        sourceCloud: "aws",
        targetCloud: "gcp",
      }).success,
    ).toBe(true);
    expect(
      CompareCloudsInput.safeParse({
        rootDir: "/tmp/workspace",
        sourceCloud: "aws",
        targetCloud: "azure",
      }).success,
    ).toBe(false);
  });

  it("validates proposal update inputs against review-state vocabulary", () => {
    expect(
      UpdateArchitectureProposalInput.safeParse({
        rootDir: "/tmp/workspace",
        componentUpdates: [{ componentId: "api", review: "accepted" }],
      }).success,
    ).toBe(true);
    expect(
      UpdateArchitectureProposalInput.safeParse({
        rootDir: "/tmp/workspace",
        componentUpdates: [{ componentId: "api", review: "approved" }],
      }).success,
    ).toBe(false);
  });

  it("validates evidence synchronization inputs with repository evidence schemas", () => {
    expect(
      SynchronizeEvidenceInput.safeParse({
        rootDir: "/tmp/workspace",
        evidence: [{ id: "missing-required-fields" }],
      }).success,
    ).toBe(false);
  });

  it("validates cost estimate inputs with usage driver schemas", () => {
    expect(
      EstimateCostInput.safeParse({
        rootDir: "/tmp/workspace",
        usageDrivers: [{ id: "missing-required-fields" }],
      }).success,
    ).toBe(false);
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

  it("creates and simulates an in-memory local scenario", async () => {
    const store = new WorkspaceStore();
    store.getOrCreate("/tmp/workspace").architecture = {
      schemaVersion: "1.0",
      id: "doc-local",
      projectId: "project-local",
      name: "Local",
      createdAt: "2026-07-23T00:00:00.000Z",
      updatedAt: "2026-07-23T00:00:00.000Z",
      source: { kind: "imported", label: "local" },
      assumptions: [],
      nodes: [
        { id: "web", name: "Web", category: "service" },
        { id: "db", name: "Database", category: "database" },
      ],
      edges: [{ id: "web-db", source: "web", target: "db", kind: "data" }],
      groups: [],
      metadata: { generator: "test" },
    };
    const tools = createMcpTools(store);

    await expect(
      tools.axon_create_scenario.handler({
        rootDir: "/tmp/workspace",
        scenario: {
          id: "growth",
          label: "Growth",
          requestsPerSecond: 3600,
          offlineNodeIds: [],
        },
      }),
    ).resolves.toMatchObject({
      version: MCP_SERVER_VERSION,
      stored: true,
      scenarioCount: 1,
    });

    await expect(
      tools.axon_simulate_scenario.handler({
        rootDir: "/tmp/workspace",
        scenarioId: "growth",
      }),
    ).resolves.toMatchObject({
      version: MCP_SERVER_VERSION,
      provenance: "derived",
      simulated: true,
      result: {
        scenarioId: "growth",
        requestsPerSecond: 3600,
      },
    });
  });

  it("compares two provided architecture snapshots with semantic diff", async () => {
    const tools = createMcpTools(new WorkspaceStore());
    const basePayload: ArchitectureDocument = {
      schemaVersion: "1.0",
      id: "doc-local",
      projectId: "project-local",
      name: "Local",
      createdAt: "2026-07-23T00:00:00.000Z",
      updatedAt: "2026-07-23T00:00:00.000Z",
      source: { kind: "imported", label: "local" },
      assumptions: [],
      nodes: [{ id: "web", name: "Web", category: "service" }],
      edges: [],
      groups: [],
      metadata: { generator: "test" },
    };
    const targetPayload: ArchitectureDocument = {
      ...basePayload,
      updatedAt: "2026-07-23T00:05:00.000Z",
      nodes: [
        { id: "web", name: "Web", category: "service" },
        { id: "db", name: "Database", category: "database" },
      ],
      edges: [{ id: "web-db", source: "web", target: "db", kind: "data" }],
    };

    await expect(
      tools.axon_compare_snapshots.handler({
        rootDir: "/tmp/workspace",
        baseSnapshot: {
          id: "snap-base",
          projectId: "project-local",
          documentVersion: 1,
          payload: basePayload,
          creationReason: "manual-snapshot",
          semanticHash: "hash-base",
          status: "active",
          createdAt: "2026-07-23T00:00:00.000Z",
        },
        targetSnapshot: {
          id: "snap-target",
          projectId: "project-local",
          documentVersion: 2,
          payload: targetPayload,
          creationReason: "repository-analysis",
          previousSnapshotId: "snap-base",
          semanticHash: "hash-target",
          status: "active",
          createdAt: "2026-07-23T00:05:00.000Z",
        },
      }),
    ).resolves.toMatchObject({
      version: MCP_SERVER_VERSION,
      provenance: "derived",
      confidence: "confirmed",
      baseSnapshot: { id: "snap-base", documentVersion: 1 },
      targetSnapshot: { id: "snap-target", documentVersion: 2 },
      diff: {
        summary: {
          addedComponents: 1,
          addedRelationships: 1,
          hasChanges: true,
        },
      },
    });
  });

  it("plans an AWS to GCP migration from a provided architecture document", async () => {
    const tools = createMcpTools(new WorkspaceStore());
    const architecture: ArchitectureDocument = {
      schemaVersion: "1.0",
      id: "doc-aws",
      projectId: "project-local",
      name: "AWS Local",
      createdAt: "2026-07-23T00:00:00.000Z",
      updatedAt: "2026-07-23T00:00:00.000Z",
      source: { kind: "imported", label: "local AWS fixture" },
      assumptions: [],
      nodes: [
        { id: "web", name: "Web Server", category: "compute", meta: "aws_instance" },
        { id: "db", name: "Postgres", category: "database", meta: "aws_db_instance" },
      ],
      edges: [{ id: "web-db", source: "web", target: "db", kind: "sync" }],
      groups: [],
      metadata: { generator: "test" },
    };

    await expect(
      tools.axon_plan_migration.handler({
        rootDir: "/tmp/workspace",
        sourceCloud: "aws",
        targetCloud: "gcp",
        architecture,
      }),
    ).resolves.toMatchObject({
      version: MCP_SERVER_VERSION,
      provenance: "derived",
      planned: true,
      catalogVersion: "1.0.0",
      result: {
        mappedComponentsCount: 2,
        unmappedComponentsCount: 0,
        targetProposal: {
          components: [
            expect.objectContaining({ id: "gcp-web", technology: "google_compute_instance" }),
            expect.objectContaining({ id: "gcp-db", technology: "google_sql_database_instance" }),
          ],
          relationships: [expect.objectContaining({ id: "gcp-rel-web-db" })],
        },
      },
    });
  });

  it("compares AWS components against deterministic GCP catalog mappings", async () => {
    const tools = createMcpTools(new WorkspaceStore());
    const architecture: ArchitectureDocument = {
      schemaVersion: "1.0",
      id: "doc-aws",
      projectId: "project-local",
      name: "AWS Local",
      createdAt: "2026-07-23T00:00:00.000Z",
      updatedAt: "2026-07-23T00:00:00.000Z",
      source: { kind: "imported", label: "local AWS fixture" },
      assumptions: [],
      nodes: [
        { id: "web", name: "Web Server", category: "compute", meta: "aws_instance" },
        { id: "queue", name: "Jobs", category: "queue", meta: "aws_sqs_queue" },
      ],
      edges: [],
      groups: [],
      metadata: { generator: "test" },
    };

    await expect(
      tools.axon_compare_clouds.handler({
        rootDir: "/tmp/workspace",
        sourceCloud: "aws",
        targetCloud: "gcp",
        architecture,
      }),
    ).resolves.toMatchObject({
      version: MCP_SERVER_VERSION,
      provenance: "derived",
      compared: true,
      catalogVersion: "1.0.0",
      summary: {
        componentCount: 2,
        mappedComponentCount: 2,
        unmappedComponentCount: 0,
      },
      comparisons: [
        expect.objectContaining({
          componentId: "web",
          targetTechnology: "google_compute_instance",
          equivalenceScore: 1,
        }),
        expect.objectContaining({
          componentId: "queue",
          targetTechnology: "google_pubsub_topic",
          equivalenceScore: 0.9,
        }),
      ],
    });
  });

  it("updates local architecture proposal review states and reports missing ids", async () => {
    const store = new WorkspaceStore();
    store.getOrCreate("/tmp/workspace").architecture = {
      schemaVersion: "1.0",
      sourceRepositoryFullName: "local://workspace",
      sourceCommitSha: "local",
      components: [
        {
          id: "api",
          name: "API",
          category: "service",
          confidence: "high",
          evidenceIds: ["e1"],
          review: "proposed",
        },
        {
          id: "db",
          name: "Database",
          category: "database",
          confidence: "medium",
          evidenceIds: ["e2"],
          review: "proposed",
        },
      ],
      relationships: [
        {
          id: "api-db",
          source: "api",
          target: "db",
          kind: "data",
          confidence: "medium",
          evidenceIds: ["e2"],
          review: "proposed",
        },
      ],
      conflicts: [],
      unresolved: [],
      createdAt: "2026-07-23T00:00:00.000Z",
    };
    const tools = createMcpTools(store);

    await expect(
      tools.axon_update_architecture_proposal.handler({
        rootDir: "/tmp/workspace",
        componentUpdates: [
          { componentId: "api", review: "accepted" },
          { componentId: "missing", review: "rejected" },
        ],
        relationshipUpdates: [{ relationshipId: "api-db", review: "rejected" }],
      }),
    ).resolves.toMatchObject({
      version: MCP_SERVER_VERSION,
      provenance: "user-confirmed",
      updated: true,
      proposal: {
        components: [expect.objectContaining({ id: "api", review: "accepted" }), expect.anything()],
        relationships: [expect.objectContaining({ id: "api-db", review: "rejected" })],
      },
      summary: {
        updatedComponents: 1,
        updatedRelationships: 1,
        missingComponentIds: ["missing"],
        missingRelationshipIds: [],
      },
    });
  });

  it("prepares approved local evidence for explicit hosted synchronization", async () => {
    const store = new WorkspaceStore();
    const state = store.getOrCreate("/tmp/workspace");
    state.evidence = [
      {
        id: "ev-api",
        filePath: "src/api.ts",
        evidenceType: "http-route",
        extractor: "js-ts-source",
        excerpt: "app.get('/health', handler)",
        fact: { technology: "Express", category: "service" },
        confidence: "high",
      },
      {
        id: "ev-secret",
        filePath: ".env",
        evidenceType: "config-env-name",
        extractor: "config-env",
        fact: { name: "DATABASE_URL", category: "configuration" },
        confidence: "medium",
      },
    ];
    state.architecture = {
      schemaVersion: "1.0",
      sourceRepositoryFullName: "local://workspace",
      sourceCommitSha: "snapshot-1",
      components: [
        {
          id: "api",
          name: "API",
          category: "service",
          confidence: "high",
          evidenceIds: ["ev-api"],
          review: "proposed",
        },
      ],
      relationships: [],
      conflicts: [],
      unresolved: [],
      createdAt: "2026-07-23T00:00:00.000Z",
    };
    const tools = createMcpTools(store);

    await expect(
      tools.axon_synchronize_evidence.handler({
        rootDir: "/tmp/workspace",
        projectId: "project-local",
        excludedEvidenceIds: ["ev-secret"],
        localAnalysisVersion: "local-analyzer-test",
      }),
    ).resolves.toMatchObject({
      version: MCP_SERVER_VERSION,
      provenance: "locally-observed",
      synchronized: false,
      readyForHostedSubmission: true,
      localAnalysisVersion: "local-analyzer-test",
      localWorkspaceSnapshotId: "snapshot-1",
      summary: {
        totalEvidenceCount: 2,
        includedEvidenceCount: 1,
        excludedEvidenceCount: 1,
        componentCount: 1,
      },
      reviewManifest: [
        expect.objectContaining({
          evidenceId: "ev-api",
          included: true,
          redactionStatus: "redacted-excerpt",
          rawSourceRetained: false,
        }),
        expect.objectContaining({
          evidenceId: "ev-secret",
          included: false,
          redactionStatus: "no-excerpt",
          rawSourceRetained: false,
        }),
      ],
      hostedSyncRequest: {
        projectId: "project-local",
        evidence: [expect.objectContaining({ id: "ev-api" })],
        excludedEvidenceIds: ["ev-secret"],
      },
    });
  });

  it("estimates architecture cost from explicit usage assumptions", async () => {
    const tools = createMcpTools(new WorkspaceStore());
    const architecture: ArchitectureDocument = {
      schemaVersion: "1.0",
      id: "doc-cost",
      projectId: "project-local",
      name: "Cost Local",
      createdAt: "2026-07-23T00:00:00.000Z",
      updatedAt: "2026-07-23T00:00:00.000Z",
      source: { kind: "imported", label: "local cost fixture" },
      assumptions: [],
      nodes: [
        { id: "api", name: "API", category: "compute", meta: "aws_instance" },
        { id: "db", name: "Database", category: "database", meta: "aws_db_instance" },
      ],
      edges: [],
      groups: [],
      metadata: { generator: "test" },
    };

    await expect(
      tools.axon_estimate_cost.handler({
        rootDir: "/tmp/workspace",
        provider: "aws",
        region: "us-east-1",
        architecture,
        includeScaleProjections: true,
        usageDrivers: [
          {
            id: "usage-api",
            componentId: "api",
            unit: "instance-hours",
            value: 730,
            source: "user-supplied",
            timeWindow: "monthly",
            confidence: "high",
            derivation: "One instance for a 730-hour month.",
            userOverride: true,
          },
          {
            id: "usage-db",
            componentId: "db",
            unit: "instance-hours",
            value: 730,
            source: "architecture-assumption",
            timeWindow: "monthly",
            confidence: "medium",
            derivation: "One managed database instance.",
            userOverride: false,
          },
        ],
      }),
    ).resolves.toMatchObject({
      version: MCP_SERVER_VERSION,
      provenance: "derived",
      estimated: true,
      baseline: {
        provider: "aws",
        region: "us-east-1",
        currency: "USD",
        pricingCatalogVersion: "2026.07.test",
        expectedMonthly: 167.9,
        lineItems: [
          expect.objectContaining({ componentId: "api", expectedMonthly: 36.5 }),
          expect.objectContaining({ componentId: "db", expectedMonthly: 131.4 }),
        ],
      },
      scaleProjections: expect.any(Object),
    });
  });
});
