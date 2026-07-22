import { type AuditRule, type FindingDraft } from "../types";

const KIND_LABEL: Record<"sync" | "data", string> = {
  sync: "synchronous",
  data: "data",
};

/**
 * Flags a component that is not marked planned but depends (sync or data) on
 * a component that is marked planned — part of the running system leaning on
 * something that does not exist yet.
 */
export const plannedDependencyRule: AuditRule = {
  id: "planned-dependency",
  version: "1.0.0",
  description:
    "Flags a running component with a synchronous or data dependency on a component marked planned.",
  evaluate({ document, index }) {
    const drafts: FindingDraft[] = [];

    for (const edge of document.edges) {
      if (edge.kind !== "sync" && edge.kind !== "data") continue;
      const source = index.nodesById.get(edge.source);
      const target = index.nodesById.get(edge.target);
      if (source === undefined || target === undefined) continue;
      if (source.planned === true || target.planned !== true) continue;

      const kindLabel = KIND_LABEL[edge.kind];

      drafts.push({
        severity: "medium",
        title: `"${source.name}" depends on planned component "${target.name}"`,
        detected: `"${source.name}" is not marked planned, but has a ${kindLabel} dependency on "${target.name}", which is marked planned (not yet running).`,
        elementIds: [edge.source, edge.target, edge.id],
        evidence: [
          {
            text: `The architecture document represents a ${kindLabel} connection from "${source.name}" to "${target.name}".`,
            elementIds: [edge.id],
          },
          {
            text: `"${target.name}" is marked planned in the document.`,
            elementIds: [edge.target],
          },
        ],
        inference:
          "Based on the current architecture document, a component of the running system depends on a component that is not yet running.",
        limitation:
          "Planned status is user-supplied metadata. This rule cannot confirm the actual deployment state of either component.",
        recommendation: `Review the rollout order. If "${source.name}" ships together with "${target.name}", consider marking it planned as well; otherwise re-point the dependency at a running component.`,
        fingerprintKey: `${edge.source}->${edge.target}`,
      });
    }

    return drafts;
  },
};
