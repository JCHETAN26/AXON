import { createHash } from "crypto";
import { type ArchitectureDocument } from "./architecture-document";

/**
 * Computes a deterministic content-addressable SHA-256 semantic hash of an ArchitectureDocument.
 * Sorts nodes, edges, and groups deterministically so pure ordering changes yield the same hash.
 * Ignores transient UI coordinate changes by default.
 */
export function computeSemanticHash(doc: ArchitectureDocument): string {
  const sortedNodes = [...doc.nodes]
    .map((n) => ({
      id: n.id,
      name: n.name,
      category: n.category,
      meta: n.meta,
      planned: n.planned,
      groupId: n.groupId,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const sortedEdges = [...doc.edges]
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      kind: e.kind,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const sortedGroups = [...doc.groups]
    .map((g) => ({
      id: g.id,
      label: g.label,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const canonicalPayload = JSON.stringify({
    nodes: sortedNodes,
    edges: sortedEdges,
    groups: sortedGroups,
  });

  return createHash("sha256").update(canonicalPayload).digest("hex");
}
