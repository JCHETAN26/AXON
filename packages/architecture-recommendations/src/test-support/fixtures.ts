import { runAudit, type AuditFinding } from "@axon/architecture-audit";
import {
  ARCHITECTURE_SCHEMA_VERSION,
  parseArchitectureDocument,
  type ArchitectureDocument,
} from "@axon/diagram-schema";

export const FIXTURE_NOW = "2026-01-01T00:00:00.000Z";

export interface FixtureNode {
  readonly id: string;
  readonly name?: string;
  readonly category?: string;
  readonly planned?: boolean;
}

export type FixtureEdge = readonly [
  source: string,
  target: string,
  kind?: "sync" | "async" | "data" | "telemetry",
];

export function buildDocument(
  nodes: readonly FixtureNode[],
  edges: readonly FixtureEdge[] = [],
): ArchitectureDocument {
  return parseArchitectureDocument({
    schemaVersion: ARCHITECTURE_SCHEMA_VERSION,
    id: "doc-fixture",
    projectId: "project-fixture",
    name: "Fixture",
    description: "Fixture document",
    createdAt: FIXTURE_NOW,
    updatedAt: FIXTURE_NOW,
    source: { kind: "generated", label: "Generated from a prompt" },
    assumptions: [{ id: "mau", label: "Monthly active users", value: "250,000" }],
    nodes: nodes.map((node) => ({
      id: node.id,
      name: node.name ?? node.id,
      category: node.category ?? "Service",
      ...(node.planned === true && { planned: true }),
      position: { x: 0, y: 0 },
    })),
    edges: edges.map(([source, target, kind]) => ({
      id: `${source}--${target}--${kind ?? "sync"}`,
      source,
      target,
      kind: kind ?? "sync",
    })),
    groups: [],
    metadata: { generator: "axon-web", notes: "Created from the sample template." },
  });
}

/** The sample architecture's topology, which produces five audit findings. */
export function buildSampleLikeDocument(): ArchitectureDocument {
  return buildDocument(
    [
      { id: "cdn" },
      { id: "gateway" },
      { id: "auth" },
      { id: "app" },
      { id: "payments" },
      { id: "workers" },
      { id: "redis" },
      { id: "postgres" },
      { id: "rabbitmq" },
      { id: "storage" },
      { id: "stripe" },
      { id: "datadog" },
    ],
    [
      ["cdn", "gateway", "sync"],
      ["gateway", "app", "sync"],
      ["app", "redis", "data"],
      ["app", "postgres", "data"],
      ["gateway", "auth", "sync"],
      ["app", "payments", "sync"],
      ["payments", "stripe", "sync"],
      ["app", "rabbitmq", "async"],
      ["rabbitmq", "workers", "async"],
      ["workers", "storage", "data"],
      ["app", "datadog", "telemetry"],
      ["postgres", "datadog", "telemetry"],
    ],
  );
}

/** Runs the real audit and returns findings as they would be persisted. */
export function buildFindings(document: ArchitectureDocument): AuditFinding[] {
  return runAudit(document).map((candidate) => ({
    ...candidate,
    elementIds: [...candidate.elementIds],
    evidence: candidate.evidence.map((item) => ({
      text: item.text,
      elementIds: [...item.elementIds],
    })),
    state: "open" as const,
    firstDetectedAt: FIXTURE_NOW,
    lastSeenAt: FIXTURE_NOW,
  }));
}
