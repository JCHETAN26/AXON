import { type ArchitectureDocument } from "@axon/diagram-schema";

import { type PatchOperation } from "./patch";

function nodeName(document: ArchitectureDocument, nodeId: string): string {
  return document.nodes.find((node) => node.id === nodeId)?.name ?? nodeId;
}

/** Plain-language summary of one operation, for the change inspector. */
export function describeOperation(
  operation: PatchOperation,
  document: ArchitectureDocument,
): string {
  switch (operation.type) {
    case "add-node":
      return `Add component "${operation.node.name}" (${operation.node.category})`;
    case "update-node": {
      const fields = Object.entries(operation.changes)
        .map(([key, value]) => `${key} → ${String(value)}`)
        .join(", ");
      return `Update component "${nodeName(document, operation.nodeId)}": ${fields}`;
    }
    case "remove-node":
      return `Remove component "${nodeName(document, operation.nodeId)}"`;
    case "add-edge":
      return `Add ${operation.edge.kind} connection from "${nodeName(document, operation.edge.source)}" to "${nodeName(document, operation.edge.target)}"`;
    case "update-edge-kind":
      return `Change connection "${operation.edgeId}" to ${operation.kind}`;
    case "remove-edge":
      return `Remove connection "${operation.edgeId}"`;
  }
}
