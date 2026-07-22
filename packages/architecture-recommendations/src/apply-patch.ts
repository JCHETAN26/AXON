import {
  safeParseArchitectureDocument,
  type ArchitectureDocument,
  type ArchitectureEdgeModel,
  type ArchitectureNodeModel,
} from "@axon/diagram-schema";

import { type PatchOperation } from "./patch";

/** Offset applied to a new node relative to its anchor, in canvas units. */
const NEW_NODE_OFFSET = { x: 288, y: 152 };

export interface PreviewSuccess {
  readonly ok: true;
  readonly document: ArchitectureDocument;
}

export interface PreviewFailure {
  readonly ok: false;
  readonly reasons: readonly string[];
}

export type PreviewResult = PreviewSuccess | PreviewFailure;

/**
 * Applies operations to a copy of the document and validates the result.
 *
 * This function is pure: it never writes to storage. Document identity
 * (id, projectId, schemaVersion, createdAt), the source record, assumptions,
 * groups, and generation metadata are all carried through untouched — a patch
 * may only change nodes, edges, and updatedAt.
 */
export function previewPatch(
  document: ArchitectureDocument,
  operations: readonly PatchOperation[],
  updatedAt: string,
): PreviewResult {
  const nodes = new Map(document.nodes.map((node) => [node.id, node]));
  const edges = new Map(document.edges.map((edge) => [edge.id, edge]));
  const reasons: string[] = [];

  for (const operation of operations) {
    switch (operation.type) {
      case "add-node": {
        if (nodes.has(operation.node.id)) {
          reasons.push(`A component with id "${operation.node.id}" already exists.`);
          break;
        }
        nodes.set(operation.node.id, buildNode(operation.node, document));
        break;
      }
      case "update-node": {
        const existing = nodes.get(operation.nodeId);
        if (existing === undefined) {
          reasons.push(`Component "${operation.nodeId}" is no longer in the document.`);
          break;
        }
        nodes.set(operation.nodeId, applyNodeChanges(existing, operation.changes));
        break;
      }
      case "remove-node": {
        if (!nodes.delete(operation.nodeId)) {
          reasons.push(`Component "${operation.nodeId}" is no longer in the document.`);
          break;
        }
        // Removing a component removes its connections; dangling edges are
        // rejected by the schema and would fail validation anyway.
        for (const [edgeId, edge] of edges) {
          if (edge.source === operation.nodeId || edge.target === operation.nodeId) {
            edges.delete(edgeId);
          }
        }
        break;
      }
      case "add-edge": {
        if (edges.has(operation.edge.id)) {
          reasons.push(`A connection with id "${operation.edge.id}" already exists.`);
          break;
        }
        if (!nodes.has(operation.edge.source) || !nodes.has(operation.edge.target)) {
          reasons.push(
            `Connection "${operation.edge.id}" references a component that is not in the document.`,
          );
          break;
        }
        edges.set(operation.edge.id, { ...operation.edge });
        break;
      }
      case "update-edge-kind": {
        const existing = edges.get(operation.edgeId);
        if (existing === undefined) {
          reasons.push(`Connection "${operation.edgeId}" is no longer in the document.`);
          break;
        }
        edges.set(operation.edgeId, { ...existing, kind: operation.kind });
        break;
      }
      case "remove-edge": {
        if (!edges.delete(operation.edgeId)) {
          reasons.push(`Connection "${operation.edgeId}" is no longer in the document.`);
        }
        break;
      }
    }
  }

  if (reasons.length > 0) {
    return { ok: false, reasons };
  }

  const candidate: ArchitectureDocument = {
    ...document,
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    updatedAt,
  };

  const validated = safeParseArchitectureDocument(candidate);
  if (!validated.success) {
    return {
      ok: false,
      reasons: validated.error.issues.map((issue) => issue.message),
    };
  }
  return { ok: true, document: validated.data };
}

/**
 * AXON — not a builder and never a model — assigns canvas coordinates. A new
 * node is placed relative to the first existing node it connects to, so the
 * result is deterministic and lands near its anchor.
 */
function buildNode(node: PatchNodeInput, document: ArchitectureDocument): ArchitectureNodeModel {
  const anchor = findAnchor(node.id, document);
  return {
    id: node.id,
    name: node.name,
    category: node.category,
    ...(node.groupId !== undefined && { groupId: node.groupId }),
    ...(node.meta !== undefined && { meta: node.meta }),
    ...(node.planned !== undefined && { planned: node.planned }),
    ...(anchor?.position !== undefined && {
      position: {
        x: anchor.position.x + NEW_NODE_OFFSET.x,
        y: anchor.position.y + NEW_NODE_OFFSET.y,
      },
    }),
  };
}

interface PatchNodeInput {
  id: string;
  name: string;
  category: string;
  groupId?: string | undefined;
  meta?: string | undefined;
  planned?: boolean | undefined;
}

/** The existing node a new id is derived from, e.g. "rabbitmq" for "rabbitmq-dead-letter". */
function findAnchor(newNodeId: string, document: ArchitectureDocument) {
  return document.nodes.find((node) => newNodeId.startsWith(`${node.id}-`));
}

function applyNodeChanges(
  node: ArchitectureNodeModel,
  changes: {
    name?: string | undefined;
    category?: string | undefined;
    groupId?: string | undefined;
    meta?: string | undefined;
    planned?: boolean | undefined;
  },
): ArchitectureNodeModel {
  return {
    ...node,
    ...(changes.name !== undefined && { name: changes.name }),
    ...(changes.category !== undefined && { category: changes.category }),
    ...(changes.groupId !== undefined && { groupId: changes.groupId }),
    ...(changes.meta !== undefined && { meta: changes.meta }),
    ...(changes.planned !== undefined && { planned: changes.planned }),
  };
}

/** True when the document already satisfies the operation. */
export function isOperationSatisfied(
  document: ArchitectureDocument,
  operation: PatchOperation,
): boolean {
  switch (operation.type) {
    case "add-node":
      return document.nodes.some((node) => node.id === operation.node.id);
    case "add-edge":
      return document.edges.some(
        (edge) =>
          edge.source === operation.edge.source &&
          edge.target === operation.edge.target &&
          edge.kind === operation.edge.kind,
      );
    case "update-node": {
      const node = document.nodes.find((candidate) => candidate.id === operation.nodeId);
      if (node === undefined) return false;
      return Object.entries(operation.changes).every(
        ([key, value]) => node[key as keyof ArchitectureNodeModel] === value,
      );
    }
    case "update-edge-kind": {
      const edge = document.edges.find((candidate) => candidate.id === operation.edgeId);
      return edge !== undefined && edge.kind === operation.kind;
    }
    case "remove-node":
      return !document.nodes.some((node) => node.id === operation.nodeId);
    case "remove-edge":
      return !document.edges.some((edge: ArchitectureEdgeModel) => edge.id === operation.edgeId);
  }
}
