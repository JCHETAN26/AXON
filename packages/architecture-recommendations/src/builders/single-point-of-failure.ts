import { type RecommendationBuilder } from "../types";

/**
 * Redundancy is deliberately manual. Introducing a replica, a load balancer,
 * or a failover path changes the operational shape of a system, and the right
 * answer depends on cost, consistency, and deployment topology that the
 * architecture document does not contain. AXON describes the decision and
 * leaves it to an engineer.
 */
export const singlePointOfFailureBuilder: RecommendationBuilder = {
  id: "review-single-point-of-failure",
  version: "1.0.0",
  ruleId: "single-point-of-failure",
  build({ finding, index }) {
    const nodeId = finding.elementIds[0];
    if (nodeId === undefined) return null;
    const node = index.nodesById.get(nodeId);
    if (node === undefined) return null;

    return {
      title: `Review redundancy for "${node.name}"`,
      proposedChange: `Decide how "${node.name}" should be made redundant — for example a second instance, a load-balanced pool, or an alternate path — and represent that decision in the architecture document.`,
      rationale: `The audit found that no alternate path around "${node.name}" is represented, so the components behind it depend on it entirely.`,
      expectedEffect:
        "Once redundancy is represented, the structural finding will resolve on the next audit run.",
      assumptions: [
        "AXON does not choose a redundancy strategy automatically. Replication, failover, and load balancing carry cost and consistency trade-offs that the architecture document does not describe.",
        "Redundancy may already exist in production without being represented. In that case the document should be updated to match reality.",
      ],
      mode: "manual-review",
      operations: [],
    };
  },
};
