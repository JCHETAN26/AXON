import { type ArchitectureDocument } from "./architecture-document";

export interface ComponentChange {
  id: string;
  name: string;
  changeType: "added" | "removed" | "modified";
  propertyChanges?: { property: string; oldValue: string | undefined; newValue: string | undefined }[];
}

export interface RelationshipChange {
  id: string;
  source: string;
  target: string;
  changeType: "added" | "removed" | "modified";
  propertyChanges?: { property: string; oldValue: string | undefined; newValue: string | undefined }[];
}

export interface SemanticDiffResult {
  baseVersion?: number;
  targetVersion?: number;
  components: ComponentChange[];
  relationships: RelationshipChange[];
  summary: {
    addedComponents: number;
    removedComponents: number;
    modifiedComponents: number;
    addedRelationships: number;
    removedRelationships: number;
    hasChanges: boolean;
  };
}

/**
 * Computes a deterministic semantic diff between a base and target ArchitectureDocument.
 */
export function computeSemanticDocumentDiff(
  base: ArchitectureDocument,
  target: ArchitectureDocument
): SemanticDiffResult {
  const baseNodeMap = new Map(base.nodes.map((n) => [n.id, n]));
  const targetNodeMap = new Map(target.nodes.map((n) => [n.id, n]));

  const components: ComponentChange[] = [];

  // Find added and modified nodes
  for (const [id, targetNode] of targetNodeMap.entries()) {
    const baseNode = baseNodeMap.get(id);

    if (!baseNode) {
      components.push({
        id,
        name: targetNode.name,
        changeType: "added",
      });
    } else {
      const propertyChanges: ComponentChange["propertyChanges"] = [];

      if (baseNode.name !== targetNode.name) {
        propertyChanges.push({ property: "name", oldValue: baseNode.name, newValue: targetNode.name });
      }
      if (baseNode.category !== targetNode.category) {
        propertyChanges.push({ property: "category", oldValue: baseNode.category, newValue: targetNode.category });
      }
      if (baseNode.meta !== targetNode.meta) {
        propertyChanges.push({
          property: "meta",
          oldValue: baseNode.meta,
          newValue: targetNode.meta,
        });
      }

      if (propertyChanges.length > 0) {
        components.push({
          id,
          name: targetNode.name,
          changeType: "modified",
          propertyChanges,
        });
      }
    }
  }

  // Find removed nodes
  for (const [id, baseNode] of baseNodeMap.entries()) {
    if (!targetNodeMap.has(id)) {
      components.push({
        id,
        name: baseNode.name,
        changeType: "removed",
      });
    }
  }

  // Relationships diff
  const baseEdgeMap = new Map(base.edges.map((e) => [e.id, e]));
  const targetEdgeMap = new Map(target.edges.map((e) => [e.id, e]));

  const relationships: RelationshipChange[] = [];

  for (const [id, targetEdge] of targetEdgeMap.entries()) {
    const baseEdge = baseEdgeMap.get(id);

    if (!baseEdge) {
      relationships.push({
        id,
        source: targetEdge.source,
        target: targetEdge.target,
        changeType: "added",
      });
    } else {
      const propertyChanges: RelationshipChange["propertyChanges"] = [];
      if (baseEdge.kind !== targetEdge.kind) {
        propertyChanges.push({ property: "kind", oldValue: baseEdge.kind, newValue: targetEdge.kind });
      }

      if (propertyChanges.length > 0) {
        relationships.push({
          id,
          source: targetEdge.source,
          target: targetEdge.target,
          changeType: "modified",
          propertyChanges,
        });
      }
    }
  }

  for (const [id, baseEdge] of baseEdgeMap.entries()) {
    if (!targetEdgeMap.has(id)) {
      relationships.push({
        id,
        source: baseEdge.source,
        target: baseEdge.target,
        changeType: "removed",
      });
    }
  }

  const addedComponents = components.filter((c) => c.changeType === "added").length;
  const removedComponents = components.filter((c) => c.changeType === "removed").length;
  const modifiedComponents = components.filter((c) => c.changeType === "modified").length;
  const addedRelationships = relationships.filter((r) => r.changeType === "added").length;
  const removedRelationships = relationships.filter((r) => r.changeType === "removed").length;

  const hasChanges = components.length > 0 || relationships.length > 0;

  return {
    components,
    relationships,
    summary: {
      addedComponents,
      removedComponents,
      modifiedComponents,
      addedRelationships,
      removedRelationships,
      hasChanges,
    },
  };
}
