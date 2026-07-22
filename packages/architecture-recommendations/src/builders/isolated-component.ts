import { type RecommendationBuilder } from "../types";

/**
 * An isolated component is ambiguous: it may be dead weight to delete, or a
 * real service whose connections were never drawn. Deleting is destructive
 * and AXON cannot tell the two apart, so this stays manual.
 */
export const isolatedComponentBuilder: RecommendationBuilder = {
  id: "review-isolated-component",
  version: "1.0.0",
  ruleId: "isolated-component",
  build({ finding, index }) {
    const nodeId = finding.elementIds[0];
    if (nodeId === undefined) return null;
    const node = index.nodesById.get(nodeId);
    if (node === undefined) return null;

    return {
      title: `Review isolated component "${node.name}"`,
      proposedChange: `Either connect "${node.name}" to the components it interacts with, or remove it from the architecture document if it is no longer part of the system.`,
      rationale: `The audit found that "${node.name}" has no represented connections, so nothing reaches it and it reaches nothing.`,
      expectedEffect:
        "Once the component is connected or removed, the isolation finding will resolve on the next audit run.",
      assumptions: [
        "AXON cannot tell whether an isolated component is obsolete or simply undocumented, and removing a component is destructive, so it makes neither change automatically.",
        "Connections that exist in production but were never drawn are invisible to the audit.",
      ],
      mode: "manual-review",
      operations: [],
    };
  },
};
