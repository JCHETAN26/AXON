import { type AuditRule, type FindingDraft } from "../types";

function plural(count: number): string {
  return count === 1 ? "" : "s";
}

/**
 * Breadth-first walk over the undirected adjacency, optionally pretending one
 * node has been removed. Returns members in deterministic visit order.
 */
function collectComponent(
  startId: string,
  neighbors: ReadonlyMap<string, readonly string[]>,
  excludedId?: string,
): string[] {
  const seen = new Set<string>([startId]);
  const queue: string[] = [startId];
  // for-of over an array being appended to visits the new members too.
  for (const currentId of queue) {
    for (const neighborId of neighbors.get(currentId) ?? []) {
      if (neighborId === excludedId || seen.has(neighborId)) continue;
      seen.add(neighborId);
      queue.push(neighborId);
    }
  }
  return queue;
}

/**
 * Flags a node whose removal leaves at least two other components without a
 * represented path to the rest of the system. The two-node threshold keeps
 * ordinary leaf edges (one stranded neighbor) from flooding the report.
 */
export const singlePointOfFailureRule: AuditRule = {
  id: "single-point-of-failure",
  version: "1.0.0",
  description:
    "Flags a component whose removal leaves at least two other components with no represented path to the rest of the system.",
  evaluate({ document, index }) {
    const drafts: FindingDraft[] = [];

    for (const node of document.nodes) {
      const memberIds = collectComponent(node.id, index.neighbors);
      // The smallest component that can strand two nodes has four members.
      if (memberIds.length < 4) continue;

      const otherIds = memberIds.filter((id) => id !== node.id);
      const assigned = new Set<string>();
      const componentsAfterRemoval: string[][] = [];
      for (const otherId of otherIds) {
        if (assigned.has(otherId)) continue;
        const component = collectComponent(otherId, index.neighbors, node.id);
        for (const memberId of component) assigned.add(memberId);
        componentsAfterRemoval.push(component);
      }
      if (componentsAfterRemoval.length < 2) continue;

      const largestSize = Math.max(...componentsAfterRemoval.map((component) => component.length));
      const strandedCount = otherIds.length - largestSize;
      if (strandedCount < 2) continue;

      const strandedIds: string[] = [];
      let largestSkipped = false;
      for (const component of componentsAfterRemoval) {
        if (!largestSkipped && component.length === largestSize) {
          largestSkipped = true;
          continue;
        }
        strandedIds.push(...component);
      }
      strandedIds.sort();

      const name = node.name;
      const strandedNames = strandedIds
        .map((id) => `"${index.nodesById.get(id)?.name ?? id}"`)
        .join(", ");
      const touchingEdgeIds = [
        ...(index.incoming.get(node.id) ?? []),
        ...(index.outgoing.get(node.id) ?? []),
      ].map((edge) => edge.id);

      drafts.push({
        severity: "high",
        title: `Potential single point of failure: "${name}"`,
        detected: `"${name}" is the only represented path connecting ${String(strandedCount)} component${plural(strandedCount)} (${strandedNames}) to the rest of the architecture.`,
        elementIds: [node.id],
        evidence: [
          {
            text: `"${name}" participates in ${String(touchingEdgeIds.length)} represented connection${plural(touchingEdgeIds.length)}.`,
            elementIds: touchingEdgeIds,
          },
          {
            text: `Removing "${name}" from the architecture document leaves ${strandedNames} with no represented path to the rest of the system.`,
            elementIds: strandedIds,
          },
        ],
        inference: `Based on the current architecture document, AXON infers a structural risk: no alternate path around "${name}" is represented, so the listed components depend on it entirely.`,
        limitation:
          "This rule reads only the architecture document. Redundancy that exists in production but is not represented — replicas, failover pairs, load balancing — is invisible to it. A structural single point of failure does not prove a production failure.",
        recommendation: `Review whether "${name}" has redundancy in production. If it does, represent it in the document; if it does not, consider introducing a redundant instance or an alternate path.`,
        fingerprintKey: node.id,
      });
    }

    return drafts;
  },
};
