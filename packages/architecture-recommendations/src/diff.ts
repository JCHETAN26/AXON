import {
  type ArchitectureDocument,
  type ArchitectureEdgeModel,
  type ArchitectureNodeModel,
} from "@axon/diagram-schema";

export type DiffState = "added" | "removed" | "modified" | "unchanged";

export interface NodeDiff {
  readonly nodeId: string;
  readonly name: string;
  readonly state: DiffState;
  /** Fields that differ, for modified nodes. */
  readonly changedFields: readonly string[];
}

export interface EdgeDiff {
  readonly edgeId: string;
  readonly source: string;
  readonly target: string;
  readonly state: DiffState;
}

export interface DocumentDiff {
  readonly nodes: readonly NodeDiff[];
  readonly edges: readonly EdgeDiff[];
  /** Node id → state, for canvas overlays. */
  readonly nodeStates: ReadonlyMap<string, DiffState>;
  readonly addedCount: number;
  readonly removedCount: number;
  readonly modifiedCount: number;
}

const COMPARED_NODE_FIELDS = ["name", "category", "groupId", "meta", "planned"] as const;

function changedNodeFields(before: ArchitectureNodeModel, after: ArchitectureNodeModel): string[] {
  // Position is layout, not architecture: moving a node is not a change.
  return COMPARED_NODE_FIELDS.filter((field) => before[field] !== after[field]);
}

function edgeIdentity(edge: ArchitectureEdgeModel): string {
  return `${edge.source}→${edge.target}`;
}

/**
 * Pure structural diff between the current document and a previewed one.
 * Ordering is by id so the comparison renders identically on every run.
 */
export function computeDocumentDiff(
  current: ArchitectureDocument,
  recommended: ArchitectureDocument,
): DocumentDiff {
  const currentNodes = new Map(current.nodes.map((node) => [node.id, node]));
  const recommendedNodes = new Map(recommended.nodes.map((node) => [node.id, node]));
  const nodeIds = [...new Set([...currentNodes.keys(), ...recommendedNodes.keys()])].sort();

  const nodes: NodeDiff[] = nodeIds.map((nodeId) => {
    const before = currentNodes.get(nodeId);
    const after = recommendedNodes.get(nodeId);
    if (before === undefined && after !== undefined) {
      return { nodeId, name: after.name, state: "added", changedFields: [] };
    }
    if (before !== undefined && after === undefined) {
      return { nodeId, name: before.name, state: "removed", changedFields: [] };
    }
    if (before === undefined || after === undefined) {
      return { nodeId, name: nodeId, state: "unchanged", changedFields: [] };
    }
    const changedFields = changedNodeFields(before, after);
    return {
      nodeId,
      name: after.name,
      state: changedFields.length > 0 ? "modified" : "unchanged",
      changedFields,
    };
  });

  const currentEdges = new Map(current.edges.map((edge) => [edge.id, edge]));
  const recommendedEdges = new Map(recommended.edges.map((edge) => [edge.id, edge]));
  const edgeIds = [...new Set([...currentEdges.keys(), ...recommendedEdges.keys()])].sort();

  const edges: EdgeDiff[] = edgeIds.map((edgeId) => {
    const before = currentEdges.get(edgeId);
    const after = recommendedEdges.get(edgeId);
    const reference = after ?? before;
    const state: DiffState =
      before === undefined
        ? "added"
        : after === undefined
          ? "removed"
          : before.kind === after.kind && edgeIdentity(before) === edgeIdentity(after)
            ? "unchanged"
            : "modified";
    return {
      edgeId,
      source: reference?.source ?? "",
      target: reference?.target ?? "",
      state,
    };
  });

  const all = [...nodes, ...edges];
  return {
    nodes,
    edges,
    nodeStates: new Map(nodes.map((node) => [node.nodeId, node.state])),
    addedCount: all.filter((item) => item.state === "added").length,
    removedCount: all.filter((item) => item.state === "removed").length,
    modifiedCount: all.filter((item) => item.state === "modified").length,
  };
}
