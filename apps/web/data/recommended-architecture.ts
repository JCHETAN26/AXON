import {
  DEMO_EDGES,
  DEMO_FINDINGS,
  DEMO_NODES,
  type EdgeKind,
  type GroupId,
  type NodeId,
} from "./demo-architecture";

/**
 * Deterministic preview-patch model: the recommended architecture is never
 * hand-written — it is derived by applying typed operations to the canonical
 * baseline graph. Every operation carries a reason and the audit findings
 * that motivated it. Nothing here modifies infrastructure or code.
 */

/** Nodes that exist only in the recommended architecture. */
export type AddedNodeId =
  "load-balancer" | "pg-pooler" | "pg-replica" | "rabbitmq-dlq" | "region-failover";

export type GraphNodeId = NodeId | AddedNodeId;

export interface GraphNode {
  id: GraphNodeId;
  groupId: GroupId;
  category: string;
  name: string;
  metrics: string;
  /** Shown with dashed-planned treatment; not part of the applied changes. */
  planned?: boolean;
}

export interface GraphEdge {
  id: string;
  source: GraphNodeId;
  target: GraphNodeId;
  kind: EdgeKind;
}

export interface ArchitectureGraph {
  version: string;
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
}

export type ArchitecturePatchOperation =
  | { type: "add-node"; node: GraphNode; reason: string; sourceFindingIds: string[] }
  | {
      type: "update-node";
      nodeId: GraphNodeId;
      changes: Partial<Omit<GraphNode, "id">>;
      reason: string;
      sourceFindingIds: string[];
    }
  | { type: "add-edge"; edge: GraphEdge; reason: string; sourceFindingIds: string[] }
  | { type: "remove-edge"; edgeId: string; reason: string; sourceFindingIds: string[] };

export interface RecommendedArchitecture {
  baselineVersion: string;
  operations: readonly ArchitecturePatchOperation[];
  resultingGraph: ArchitectureGraph;
}

export const BASELINE_VERSION = "baseline-v1";
export const RECOMMENDED_VERSION = "recommended-v1";

/** The canonical baseline expressed as a graph (the hero's `active` flag is presentation-only). */
export const CURRENT_GRAPH: ArchitectureGraph = {
  version: BASELINE_VERSION,
  nodes: DEMO_NODES,
  edges: DEMO_EDGES.map(({ id, source, target, kind }) => ({ id, source, target, kind })),
};

export const RECOMMENDED_OPERATIONS: readonly ArchitecturePatchOperation[] = [
  // Authentication resilience (auth-spof).
  {
    type: "update-node",
    nodeId: "auth",
    changes: { metrics: "3 pods · multi-az" },
    reason: "Replicate authentication across availability zones.",
    sourceFindingIds: ["auth-spof"],
  },
  {
    type: "add-node",
    node: {
      id: "load-balancer",
      groupId: "edge",
      category: "Routing",
      name: "health-aware-lb",
      metrics: "l7 · health checks",
    },
    reason: "Route requests around unhealthy instances.",
    sourceFindingIds: ["auth-spof"],
  },
  {
    type: "add-edge",
    edge: { id: "gateway-lb", source: "gateway", target: "load-balancer", kind: "sync" },
    reason: "All service traffic flows through health-aware routing.",
    sourceFindingIds: ["auth-spof"],
  },
  {
    type: "add-edge",
    edge: { id: "lb-auth", source: "load-balancer", target: "auth", kind: "sync" },
    reason: "Authentication sits behind the load balancer.",
    sourceFindingIds: ["auth-spof"],
  },
  {
    type: "add-edge",
    edge: { id: "lb-app", source: "load-balancer", target: "app", kind: "sync" },
    reason: "Application traffic sits behind the load balancer.",
    sourceFindingIds: ["auth-spof"],
  },
  {
    type: "remove-edge",
    edgeId: "gateway-auth",
    reason: "Direct gateway-to-auth routing is replaced by the load balancer.",
    sourceFindingIds: ["auth-spof"],
  },
  {
    type: "remove-edge",
    edgeId: "gateway-app",
    reason: "Direct gateway-to-app routing is replaced by the load balancer.",
    sourceFindingIds: ["auth-spof"],
  },
  // Database headroom (postgres-saturation).
  {
    type: "update-node",
    nodeId: "app",
    changes: { metrics: "go · 12 pods · autoscaling" },
    reason: "Scale the application tier ahead of the database constraint.",
    sourceFindingIds: ["postgres-saturation"],
  },
  {
    type: "add-node",
    node: {
      id: "pg-pooler",
      groupId: "data",
      category: "Database",
      name: "pgbouncer",
      metrics: "pooling · 300→60 conn",
    },
    reason: "Reduce connection demand on PostgreSQL.",
    sourceFindingIds: ["postgres-saturation"],
  },
  {
    type: "add-edge",
    edge: { id: "app-pooler", source: "app", target: "pg-pooler", kind: "data" },
    reason: "Database access moves through the pooler.",
    sourceFindingIds: ["postgres-saturation"],
  },
  {
    type: "add-edge",
    edge: { id: "pooler-postgres", source: "pg-pooler", target: "postgres", kind: "data" },
    reason: "The pooler multiplexes connections to the primary.",
    sourceFindingIds: ["postgres-saturation"],
  },
  {
    type: "remove-edge",
    edgeId: "app-postgres",
    reason: "Direct application-to-database connections are removed.",
    sourceFindingIds: ["postgres-saturation"],
  },
  {
    type: "add-node",
    node: {
      id: "pg-replica",
      groupId: "data",
      category: "Database",
      name: "pg-read-replica",
      metrics: "async replication",
    },
    reason: "Serve heavy reads without loading the primary.",
    sourceFindingIds: ["postgres-saturation"],
  },
  {
    type: "add-edge",
    edge: { id: "postgres-replica", source: "postgres", target: "pg-replica", kind: "data" },
    reason: "The replica follows the primary asynchronously.",
    sourceFindingIds: ["postgres-saturation"],
  },
  {
    type: "add-edge",
    edge: { id: "pooler-replica", source: "pg-pooler", target: "pg-replica", kind: "data" },
    reason: "Read traffic can be directed at the replica.",
    sourceFindingIds: ["postgres-saturation"],
  },
  {
    type: "update-node",
    nodeId: "redis",
    changes: { metrics: "hit 97.2% · read-through" },
    reason: "Make the cached read path explicit.",
    sourceFindingIds: ["postgres-saturation"],
  },
  // Queue reliability (rabbitmq-dlq).
  {
    type: "add-node",
    node: {
      id: "rabbitmq-dlq",
      groupId: "data",
      category: "Broker",
      name: "dead-letter-queue",
      metrics: "retry ×3 → park",
    },
    reason: "Give failed messages a terminal, observable path.",
    sourceFindingIds: ["rabbitmq-dlq"],
  },
  {
    type: "add-edge",
    edge: { id: "rabbitmq-to-dlq", source: "rabbitmq", target: "rabbitmq-dlq", kind: "async" },
    reason: "Exhausted retries land in the dead-letter queue.",
    sourceFindingIds: ["rabbitmq-dlq"],
  },
  {
    type: "add-edge",
    edge: { id: "workers-dlq", source: "workers", target: "rabbitmq-dlq", kind: "async" },
    reason: "Workers route poison messages out of the retry loop.",
    sourceFindingIds: ["rabbitmq-dlq"],
  },
  // Telemetry coverage (datadog-telemetry).
  {
    type: "add-edge",
    edge: { id: "rabbitmq-datadog", source: "rabbitmq", target: "datadog", kind: "telemetry" },
    reason: "Extend telemetry to queue depth and consumer lag.",
    sourceFindingIds: ["datadog-telemetry"],
  },
  // Planned, not yet available.
  {
    type: "add-node",
    node: {
      id: "region-failover",
      groupId: "external",
      category: "Region",
      name: "us-west-failover",
      metrics: "cold standby",
      planned: true,
    },
    reason: "Planned: regional failover is not currently available.",
    sourceFindingIds: ["auth-spof"],
  },
];

/** Applies patch operations to a baseline graph. Pure; throws on inconsistency. */
export function applyPatches(
  baseline: ArchitectureGraph,
  operations: readonly ArchitecturePatchOperation[],
): ArchitectureGraph {
  const nodes = new Map(baseline.nodes.map((node) => [node.id, node]));
  const edges = new Map(baseline.edges.map((edge) => [edge.id, edge]));

  for (const operation of operations) {
    switch (operation.type) {
      case "add-node": {
        if (nodes.has(operation.node.id)) {
          throw new Error(`add-node: ${operation.node.id} already exists`);
        }
        nodes.set(operation.node.id, operation.node);
        break;
      }
      case "update-node": {
        const existing = nodes.get(operation.nodeId);
        if (existing === undefined) {
          throw new Error(`update-node: ${operation.nodeId} does not exist`);
        }
        nodes.set(operation.nodeId, { ...existing, ...operation.changes });
        break;
      }
      case "add-edge": {
        if (edges.has(operation.edge.id)) {
          throw new Error(`add-edge: ${operation.edge.id} already exists`);
        }
        if (!nodes.has(operation.edge.source) || !nodes.has(operation.edge.target)) {
          throw new Error(`add-edge: ${operation.edge.id} references a missing node`);
        }
        edges.set(operation.edge.id, operation.edge);
        break;
      }
      case "remove-edge": {
        if (!edges.delete(operation.edgeId)) {
          throw new Error(`remove-edge: ${operation.edgeId} does not exist`);
        }
        break;
      }
    }
  }

  return {
    version: RECOMMENDED_VERSION,
    nodes: [...nodes.values()],
    edges: [...edges.values()],
  };
}

export const RECOMMENDED_ARCHITECTURE: RecommendedArchitecture = {
  baselineVersion: BASELINE_VERSION,
  operations: RECOMMENDED_OPERATIONS,
  resultingGraph: applyPatches(CURRENT_GRAPH, RECOMMENDED_OPERATIONS),
};

export type DiffState = "added" | "modified" | "removed" | "planned" | "unchanged";

export interface EdgeChange {
  kind: "added" | "removed";
  edge: GraphEdge;
  reason: string;
  sourceFindingIds: readonly string[];
}

export interface ArchitectureDiff {
  nodeStates: ReadonlyMap<GraphNodeId, DiffState>;
  edgeChanges: readonly EdgeChange[];
}

/** Derives diff states purely from the patch operations. */
export function computeDiff(): ArchitectureDiff {
  const nodeStates = new Map<GraphNodeId, DiffState>(
    CURRENT_GRAPH.nodes.map((node) => [node.id, "unchanged"]),
  );
  const baselineEdges = new Map(CURRENT_GRAPH.edges.map((edge) => [edge.id, edge]));
  const edgeChanges: EdgeChange[] = [];

  for (const operation of RECOMMENDED_OPERATIONS) {
    switch (operation.type) {
      case "add-node":
        nodeStates.set(operation.node.id, operation.node.planned === true ? "planned" : "added");
        break;
      case "update-node":
        nodeStates.set(operation.nodeId, "modified");
        break;
      case "add-edge":
        edgeChanges.push({
          kind: "added",
          edge: operation.edge,
          reason: operation.reason,
          sourceFindingIds: operation.sourceFindingIds,
        });
        break;
      case "remove-edge": {
        const edge = baselineEdges.get(operation.edgeId);
        if (edge !== undefined) {
          edgeChanges.push({
            kind: "removed",
            edge,
            reason: operation.reason,
            sourceFindingIds: operation.sourceFindingIds,
          });
        }
        break;
      }
    }
  }

  return { nodeStates, edgeChanges };
}

export function findingCode(findingId: string): string {
  return DEMO_FINDINGS.find((finding) => finding.id === findingId)?.code ?? findingId;
}

export function graphNode(graph: ArchitectureGraph, id: GraphNodeId): GraphNode {
  const node = graph.nodes.find((candidate) => candidate.id === id);
  if (node === undefined) {
    throw new Error(`Unknown graph node: ${id}`);
  }
  return node;
}

/** Baseline weaknesses surfaced in the Current view. */
export interface CurrentGap {
  id: string;
  label: string;
  nodeId?: NodeId;
  sourceFindingId?: string;
  /** True for positive observations (e.g. telemetry already connected). */
  healthy?: boolean;
}

export const CURRENT_GAPS: readonly CurrentGap[] = [
  {
    id: "auth-single",
    label: "Authentication service deployed as a single instance",
    nodeId: "auth",
    sourceFindingId: "auth-spof",
  },
  {
    id: "direct-db",
    label: "Application services access PostgreSQL directly",
    nodeId: "postgres",
    sourceFindingId: "postgres-saturation",
  },
  {
    id: "no-dlq",
    label: "RabbitMQ has no dead-letter queue",
    nodeId: "rabbitmq",
    sourceFindingId: "rabbitmq-dlq",
  },
  {
    id: "no-pooler",
    label: "PostgreSQL has no connection pooler or read replica",
    nodeId: "postgres",
    sourceFindingId: "postgres-saturation",
  },
  { id: "no-failover", label: "No explicit regional failover" },
  {
    id: "telemetry-ok",
    label: "Datadog telemetry is connected",
    nodeId: "datadog",
    sourceFindingId: "datadog-telemetry",
    healthy: true,
  },
];
