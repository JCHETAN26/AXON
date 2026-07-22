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
    createdAt: FIXTURE_NOW,
    updatedAt: FIXTURE_NOW,
    source: { kind: "manual" },
    assumptions: [],
    nodes: nodes.map((node) => ({
      id: node.id,
      name: node.name ?? node.id,
      category: node.category ?? "Service",
      ...(node.planned === true && { planned: true }),
    })),
    edges: edges.map(([source, target, kind]) => ({
      id: `${source}--${target}--${kind ?? "sync"}`,
      source,
      target,
      kind: kind ?? "sync",
    })),
    groups: [],
    metadata: {},
  });
}

/**
 * Same topology as the AXON sample project (ids only, no positions/groups).
 * Expected findings: SPOF on gateway/app/rabbitmq, dead-letter on rabbitmq,
 * one document-scoped telemetry-coverage gap.
 */
export function buildSampleLikeDocument(): ArchitectureDocument {
  const nodeIds = [
    "cdn",
    "gateway",
    "app",
    "redis",
    "postgres",
    "auth",
    "payments",
    "stripe",
    "rabbitmq",
    "workers",
    "storage",
    "datadog",
  ];
  return buildDocument(
    nodeIds.map((id) => ({ id })),
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
