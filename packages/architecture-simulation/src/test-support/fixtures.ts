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
  /** Technical note; the engine reads capacity hints out of it. */
  readonly meta?: string;
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
      ...(node.meta !== undefined && { meta: node.meta }),
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

/** The sample architecture's topology with its real categories. */
export function buildSampleLikeDocument(): ArchitectureDocument {
  return buildDocument(
    [
      { id: "cdn", name: "cloudflare", category: "Edge Network" },
      { id: "gateway", name: "api-gateway", category: "Gateway", meta: "rate-limit 5k/s" },
      { id: "auth", name: "auth-service", category: "Auth", meta: "2 pods · single az" },
      { id: "app", name: "app-service", category: "Compute", meta: "go · 6 pods" },
      { id: "payments", name: "payments-service", category: "Service" },
      { id: "workers", name: "worker-pool", category: "Worker", meta: "temporal · 8 workers" },
      { id: "redis", name: "redis-cluster", category: "Cache", meta: "hit 97.2%" },
      { id: "postgres", name: "postgresql", category: "Database", meta: "conn 82/300" },
      { id: "rabbitmq", name: "rabbitmq", category: "Broker", meta: "12 consumers" },
      { id: "storage", name: "object-storage", category: "Storage" },
      { id: "stripe", name: "stripe", category: "External" },
      { id: "datadog", name: "datadog", category: "Observability" },
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
