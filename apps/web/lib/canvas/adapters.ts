import { type ArchitectureDocument, type ArchitectureEdgeKindModel } from "@axon/diagram-schema";
import { type Edge, type Node } from "@xyflow/react";

/**
 * Adapters between the persisted ArchitectureDocument (source of truth) and
 * React Flow's canvas state (interaction layer). Both directions are pure:
 * nothing is mutated, and React Flow-specific state (selection, dragging,
 * measured sizes) never reaches persistence.
 */

export interface ArchitectureNodeData {
  name: string;
  category: string;
  groupId?: string;
  meta?: string;
  iconId?: string;
  planned?: boolean;
  [key: string]: unknown;
}

export interface ArchitectureEdgeData {
  kind: ArchitectureEdgeKindModel;
  [key: string]: unknown;
}

/** Field patch where an explicit undefined clears the optional field. */
export type ArchitectureNodeDataPatch = {
  [K in keyof ArchitectureNodeData]?: ArchitectureNodeData[K] | undefined;
};

export type CanvasNode = Node<ArchitectureNodeData, "architecture">;
export type CanvasEdge = Edge<ArchitectureEdgeData, "architecture">;

export interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

const FALLBACK_COLUMN_WIDTH = 260;
const FALLBACK_ROW_HEIGHT = 150;
const FALLBACK_MARGIN = { x: 40, y: 60 };

export interface ArchitectureLayoutOptions {
  readonly preserveExistingPositions?: boolean;
}

/**
 * Deterministic architecture-aware layout for documents saved before layout
 * existed, previews, and future auto-layout actions. Dependencies flow
 * left-to-right; peers are sorted stably for reproducibility.
 */
export function computeArchitectureAwareLayout(
  document: ArchitectureDocument,
  options: ArchitectureLayoutOptions = {},
): Map<string, { x: number; y: number }> {
  const preserveExistingPositions = options.preserveExistingPositions ?? true;
  const positions = new Map<string, { x: number; y: number }>();
  const nodeIds = new Set(document.nodes.map((node) => node.id));
  const indegree = new Map(document.nodes.map((node) => [node.id, 0]));
  const outgoing = new Map<string, string[]>();
  for (const edge of document.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }

  const byId = new Map(document.nodes.map((node) => [node.id, node]));
  const stableNodeSort = (a: string, b: string) => {
    const left = byId.get(a);
    const right = byId.get(b);
    return `${left?.groupId ?? ""}:${left?.name ?? a}`.localeCompare(
      `${right?.groupId ?? ""}:${right?.name ?? b}`,
    );
  };
  const queue = [...indegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([id]) => id)
    .sort(stableNodeSort);
  const depth = new Map<string, number>();
  for (const id of queue) depth.set(id, 0);

  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined) break;
    const nextDepth = (depth.get(id) ?? 0) + 1;
    for (const target of outgoing.get(id) ?? []) {
      depth.set(target, Math.max(depth.get(target) ?? 0, nextDepth));
      const remaining = (indegree.get(target) ?? 0) - 1;
      indegree.set(target, remaining);
      if (remaining === 0) {
        queue.push(target);
        queue.sort(stableNodeSort);
      }
    }
  }

  for (const node of document.nodes) {
    if (!depth.has(node.id)) depth.set(node.id, 0);
  }

  const layers = new Map<number, string[]>();
  for (const [id, layer] of depth) {
    layers.set(layer, [...(layers.get(layer) ?? []), id]);
  }
  for (const [layer, ids] of layers) {
    ids.sort(stableNodeSort).forEach((id, rowIndex) => {
      const node = byId.get(id);
      if (node === undefined) return;
      if (preserveExistingPositions && node.position !== undefined) {
        positions.set(id, node.position);
        return;
      }
      positions.set(id, {
        x: FALLBACK_MARGIN.x + layer * FALLBACK_COLUMN_WIDTH,
        y: FALLBACK_MARGIN.y + rowIndex * FALLBACK_ROW_HEIGHT,
      });
    });
  }

  return positions;
}

/**
 * Deterministic positions for documents saved before layout existed.
 */
function fallbackPositions(document: ArchitectureDocument): Map<string, { x: number; y: number }> {
  const layout = computeArchitectureAwareLayout(document);
  for (const node of document.nodes) {
    if (node.position !== undefined) {
      layout.set(node.id, node.position);
    }
  }
  return layout;
}

export function documentToCanvasState(document: ArchitectureDocument): CanvasState {
  const fallback = fallbackPositions(document);
  const nodes: CanvasNode[] = document.nodes.map((node) => ({
    id: node.id,
    type: "architecture",
    position: node.position ??
      fallback.get(node.id) ?? { x: FALLBACK_MARGIN.x, y: FALLBACK_MARGIN.y },
    data: {
      name: node.name,
      category: node.category,
      ...(node.groupId !== undefined && { groupId: node.groupId }),
      ...(node.meta !== undefined && { meta: node.meta }),
      ...(node.iconId !== undefined && { iconId: node.iconId }),
      ...(node.planned !== undefined && { planned: node.planned }),
    },
  }));

  const edges: CanvasEdge[] = document.edges.map((edge) => ({
    id: edge.id,
    type: "architecture",
    source: edge.source,
    target: edge.target,
    data: { kind: edge.kind },
  }));

  return { nodes, edges };
}

/**
 * Rebuilds a document from canvas state. Identity, groups, assumptions,
 * source, and metadata come from the previous document; only node and edge
 * domain fields (and rounded positions) come from the canvas.
 */
export function canvasStateToDocument(
  previous: ArchitectureDocument,
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
  updatedAt: string,
): ArchitectureDocument {
  return {
    schemaVersion: previous.schemaVersion,
    id: previous.id,
    projectId: previous.projectId,
    name: previous.name,
    ...(previous.description !== undefined && { description: previous.description }),
    createdAt: previous.createdAt,
    updatedAt,
    source: previous.source,
    assumptions: previous.assumptions.map((assumption) => ({ ...assumption })),
    groups: previous.groups.map((group) => ({ ...group })),
    nodes: nodes.map((node) => ({
      id: node.id,
      name: node.data.name,
      category: node.data.category,
      ...(node.data.groupId !== undefined && { groupId: node.data.groupId }),
      ...(node.data.meta !== undefined && { meta: node.data.meta }),
      ...(node.data.iconId !== undefined && { iconId: node.data.iconId }),
      ...(node.data.planned !== undefined && { planned: node.data.planned }),
      position: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      kind: edge.data?.kind ?? "sync",
    })),
    metadata: { ...previous.metadata },
  };
}

function slugify(raw: string): string {
  const slug = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug.length > 0 ? slug : "node";
}

export function createUniqueNodeId(name: string, existingIds: ReadonlySet<string>): string {
  const base = slugify(name);
  if (!existingIds.has(base)) {
    return base;
  }
  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

export function createUniqueEdgeId(
  source: string,
  target: string,
  kind: ArchitectureEdgeKindModel,
  existingIds: ReadonlySet<string>,
): string {
  const base = `${source}--${target}--${kind}`;
  if (!existingIds.has(base)) {
    return base;
  }
  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}
