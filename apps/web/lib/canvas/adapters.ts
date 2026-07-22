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

/**
 * Deterministic positions for documents saved before layout existed (e.g.
 * the sample template): one column per group, ungrouped nodes trailing.
 */
function fallbackPositions(document: ArchitectureDocument): Map<string, { x: number; y: number }> {
  const columnOrder: (string | undefined)[] = [
    ...document.groups.map((group) => group.id),
    undefined,
  ];
  const positions = new Map<string, { x: number; y: number }>();
  columnOrder.forEach((groupId, columnIndex) => {
    document.nodes
      .filter((node) => node.groupId === groupId)
      .forEach((node, rowIndex) => {
        positions.set(node.id, {
          x: FALLBACK_MARGIN.x + columnIndex * FALLBACK_COLUMN_WIDTH,
          y: FALLBACK_MARGIN.y + rowIndex * FALLBACK_ROW_HEIGHT,
        });
      });
  });
  return positions;
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
