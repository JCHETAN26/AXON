import { type PatchOperation } from "../patch";
import { type RecommendationBuilder } from "../types";

/**
 * Adds a dead-letter queue beside a broker that has no represented terminal
 * path for undeliverable messages, and connects the broker to it.
 */
export const deadLetterPathBuilder: RecommendationBuilder = {
  id: "add-dead-letter-path",
  version: "1.0.0",
  ruleId: "missing-dead-letter-path",
  build({ finding, index }) {
    const brokerId = finding.elementIds[0];
    if (brokerId === undefined) return null;
    const broker = index.nodesById.get(brokerId);
    if (broker === undefined) return null;

    // Deterministic id derived from the broker, so rebuilding the same
    // recommendation always targets the same node.
    const dlqId = `${brokerId}-dead-letter`;
    const operations: PatchOperation[] = [
      {
        type: "add-node",
        node: {
          id: dlqId,
          name: `${broker.name}-dead-letter`,
          category: "Broker",
          ...(broker.groupId !== undefined && { groupId: broker.groupId }),
          meta: "dead-letter path",
        },
      },
      {
        type: "add-edge",
        edge: {
          id: `${brokerId}--${dlqId}--async`,
          source: brokerId,
          target: dlqId,
          kind: "async",
        },
      },
    ];

    return {
      title: `Represent a dead-letter path for "${broker.name}"`,
      proposedChange: `Add a dead-letter component "${broker.name}-dead-letter" to the architecture document and connect "${broker.name}" to it with an asynchronous connection.`,
      rationale: `The audit found that "${broker.name}" receives asynchronous messages but has no represented destination for messages a consumer cannot process.`,
      expectedEffect:
        "The AXON architecture model will show an explicit terminal path for undeliverable messages, and the dead-letter finding will resolve on the next audit run.",
      assumptions: [
        "Assumes the broker supports a dead-letter destination. AXON reads the architecture document only and cannot see the broker's actual configuration.",
        "If a dead-letter queue already exists in production but was never drawn, this change documents it rather than creating it.",
        "This is an architecture-document change. Implementation still requires engineering review.",
      ],
      mode: "automatic",
      operations,
    };
  },
};
