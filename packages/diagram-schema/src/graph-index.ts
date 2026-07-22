import {
  type ArchitectureDocument,
  type ArchitectureEdgeModel,
  type ArchitectureNodeModel,
} from "./architecture-document";

/**
 * Precomputed lookups over a document's graph, built once per pass so every
 * consumer (audit rules, simulation propagation) sees the same immutable
 * view. Iteration order is always document order — a requirement for
 * deterministic output.
 */
export interface GraphIndex {
  readonly nodesById: ReadonlyMap<string, ArchitectureNodeModel>;
  /** Edges leaving a node, in document order. */
  readonly outgoing: ReadonlyMap<string, readonly ArchitectureEdgeModel[]>;
  /** Edges entering a node, in document order. */
  readonly incoming: ReadonlyMap<string, readonly ArchitectureEdgeModel[]>;
  /** Undirected adjacency over every edge kind, in document order. */
  readonly neighbors: ReadonlyMap<string, readonly string[]>;
}

export function buildGraphIndex(document: ArchitectureDocument): GraphIndex {
  const nodesById = new Map<string, ArchitectureNodeModel>();
  const outgoing = new Map<string, ArchitectureEdgeModel[]>();
  const incoming = new Map<string, ArchitectureEdgeModel[]>();
  const neighbors = new Map<string, string[]>();

  for (const node of document.nodes) {
    nodesById.set(node.id, node);
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
    neighbors.set(node.id, []);
  }

  for (const edge of document.edges) {
    outgoing.get(edge.source)?.push(edge);
    incoming.get(edge.target)?.push(edge);
    const sourceNeighbors = neighbors.get(edge.source);
    if (sourceNeighbors && !sourceNeighbors.includes(edge.target)) {
      sourceNeighbors.push(edge.target);
    }
    const targetNeighbors = neighbors.get(edge.target);
    if (targetNeighbors && !targetNeighbors.includes(edge.source)) {
      targetNeighbors.push(edge.source);
    }
  }

  return { nodesById, outgoing, incoming, neighbors };
}
