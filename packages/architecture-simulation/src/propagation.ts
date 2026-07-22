import {
  type ArchitectureEdgeModel,
  type ArchitectureDocument,
  type GraphIndex,
} from "@axon/diagram-schema";

import { type ComponentKind } from "./component-kind";

/**
 * Telemetry edges represent observability, not request load, so they are
 * excluded from propagation entirely.
 */
export function carriesLoad(edge: ArchitectureEdgeModel): boolean {
  return edge.kind !== "telemetry";
}

/**
 * Share of a component's outbound rate that travels along one edge. Sync and
 * data edges carry the full request path.
 *
 * The async fan-out is the share of *requests* that enqueue a job, so it
 * applies where work is produced — not again when a queue drains to its
 * consumers, which forward everything they hold.
 */
export function edgeLoadShare(
  edge: ArchitectureEdgeModel,
  asyncFanoutPercent: number,
  sourceKind: ComponentKind,
): number {
  if (edge.kind === "telemetry") return 0;
  if (edge.kind === "async") return sourceKind === "queue" ? 1 : asyncFanoutPercent / 100;
  return 1;
}

/**
 * Components where scenario traffic enters: no inbound load-carrying edge,
 * but at least one outbound one. A node with neither (an isolated node, or a
 * telemetry sink) is not on a represented request path and receives no load.
 */
export function findEntryNodeIds(document: ArchitectureDocument, index: GraphIndex): string[] {
  return document.nodes
    .filter((node) => {
      const inbound = (index.incoming.get(node.id) ?? []).filter(carriesLoad);
      const outbound = (index.outgoing.get(node.id) ?? []).filter(carriesLoad);
      return inbound.length === 0 && outbound.length > 0;
    })
    .map((node) => node.id);
}

export interface PropagationOrder {
  /** Nodes in dependency order; safe to evaluate sequentially. */
  readonly order: readonly string[];
  /** Nodes inside a represented dependency cycle, in document order. */
  readonly cycleNodeIds: readonly string[];
}

/**
 * Kahn topological sort over load-carrying edges. Nodes left over are part of
 * a cycle: they are appended in document order and reported, and their back
 * edges contribute no load — AXON does not model feedback loops.
 */
export function computePropagationOrder(
  document: ArchitectureDocument,
  index: GraphIndex,
): PropagationOrder {
  const remainingInDegree = new Map<string, number>();
  for (const node of document.nodes) {
    remainingInDegree.set(node.id, (index.incoming.get(node.id) ?? []).filter(carriesLoad).length);
  }

  // Seeded in document order, so ties resolve identically on every run.
  const queue = document.nodes
    .filter((node) => remainingInDegree.get(node.id) === 0)
    .map((node) => node.id);
  const order: string[] = [];

  for (const nodeId of queue) {
    order.push(nodeId);
    for (const edge of (index.outgoing.get(nodeId) ?? []).filter(carriesLoad)) {
      const next = (remainingInDegree.get(edge.target) ?? 0) - 1;
      remainingInDegree.set(edge.target, next);
      if (next === 0) {
        queue.push(edge.target);
      }
    }
  }

  const settled = new Set(order);
  const cycleNodeIds = document.nodes
    .filter((node) => !settled.has(node.id))
    .map((node) => node.id);

  return { order: [...order, ...cycleNodeIds], cycleNodeIds };
}
