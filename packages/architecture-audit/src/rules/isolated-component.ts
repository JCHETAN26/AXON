import { type AuditRule, type FindingDraft } from "../types";

/** Flags a node with no represented connections of any kind. */
export const isolatedComponentRule: AuditRule = {
  id: "isolated-component",
  version: "1.0.0",
  description: "Flags a component with no represented connections in the document.",
  evaluate({ document, index }) {
    const drafts: FindingDraft[] = [];

    for (const node of document.nodes) {
      const incoming = index.incoming.get(node.id) ?? [];
      const outgoing = index.outgoing.get(node.id) ?? [];
      if (incoming.length > 0 || outgoing.length > 0) continue;

      drafts.push({
        severity: "low",
        title: `Isolated component: "${node.name}"`,
        detected: `"${node.name}" has no represented connections in the architecture document.`,
        elementIds: [node.id],
        evidence: [
          {
            text: `The document represents ${String(document.edges.length)} connection${document.edges.length === 1 ? "" : "s"}; none involve "${node.name}".`,
            elementIds: [node.id],
          },
        ],
        inference:
          "Based on the current architecture document, nothing reaches this component and it reaches nothing.",
        limitation:
          "Connections that exist in production but are not drawn in the document cannot be seen by this rule.",
        recommendation:
          "Review whether this component is still part of the system. Connect it to the architecture or remove it from the document.",
        fingerprintKey: node.id,
      });
    }

    return drafts;
  },
};
