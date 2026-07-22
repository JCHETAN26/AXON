import { type RecommendationBuilder } from "../types";

/**
 * Marks a running component as planned when it depends on something that is
 * itself planned, so the document stops implying the dependency is live.
 */
export const plannedDependencyBuilder: RecommendationBuilder = {
  id: "align-planned-dependency",
  version: "1.0.0",
  ruleId: "planned-dependency",
  build({ finding, index }) {
    // The rule reports [sourceId, targetId, edgeId].
    const sourceId = finding.elementIds[0];
    const targetId = finding.elementIds[1];
    if (sourceId === undefined || targetId === undefined) return null;
    const source = index.nodesById.get(sourceId);
    const target = index.nodesById.get(targetId);
    if (source === undefined || target === undefined) return null;

    return {
      title: `Mark "${source.name}" as planned`,
      proposedChange: `Set "${source.name}" to planned in the architecture document, matching the status of "${target.name}".`,
      rationale: `The audit found that "${source.name}" is represented as running while depending on "${target.name}", which is marked planned.`,
      expectedEffect:
        "The AXON architecture model will represent both components as planned, so the running system is no longer shown as depending on something that does not exist yet.",
      assumptions: [
        `Assumes "${source.name}" ships together with "${target.name}". If it is genuinely running today, the dependency should be re-pointed at a running component instead — that is a different change AXON does not make automatically.`,
        "Planned status is user-supplied metadata; AXON cannot confirm the deployment state of either component.",
        "This is an architecture-document change. Implementation still requires engineering review.",
      ],
      mode: "automatic",
      operations: [{ type: "update-node", nodeId: sourceId, changes: { planned: true } }],
    };
  },
};
