import { type AuditRule, type FindingDraft } from "../types";

/**
 * Flags a component that receives asynchronous traffic and has exactly one
 * outgoing asynchronous path — a broker shape with no represented dead-letter
 * or retry destination.
 */
export const missingDeadLetterPathRule: AuditRule = {
  id: "missing-dead-letter-path",
  version: "1.0.0",
  description:
    "Flags a component that receives asynchronous messages and has a single outgoing asynchronous path, with no dead-letter path represented.",
  evaluate({ document, index }) {
    const drafts: FindingDraft[] = [];

    for (const node of document.nodes) {
      const incomingAsync = (index.incoming.get(node.id) ?? []).filter(
        (edge) => edge.kind === "async",
      );
      const outgoingAsync = (index.outgoing.get(node.id) ?? []).filter(
        (edge) => edge.kind === "async",
      );
      if (incomingAsync.length === 0 || outgoingAsync.length !== 1) continue;
      const onlyPath = outgoingAsync[0];
      if (onlyPath === undefined) continue;

      const name = node.name;
      const sourceNames = incomingAsync
        .map((edge) => `"${index.nodesById.get(edge.source)?.name ?? edge.source}"`)
        .join(", ");
      const targetName = index.nodesById.get(onlyPath.target)?.name ?? onlyPath.target;

      drafts.push({
        severity: "medium",
        title: `No dead-letter path is represented for "${name}"`,
        detected: `"${name}" receives asynchronous messages and has a single outgoing asynchronous path. No dead-letter or retry path is represented in the architecture document.`,
        elementIds: [node.id],
        evidence: [
          {
            text: `"${name}" receives asynchronous traffic from ${sourceNames}.`,
            elementIds: incomingAsync.map((edge) => edge.id),
          },
          {
            text: `The only represented outgoing asynchronous path is to "${targetName}".`,
            elementIds: [onlyPath.id],
          },
        ],
        inference:
          "Based on the current architecture document, messages that the downstream consumer cannot process have no represented destination.",
        limitation:
          "The rule only sees represented connections. A dead-letter queue configured inside the broker but not drawn in the document cannot be detected. The finding describes the document, not the broker's actual configuration.",
        recommendation: `Review how undeliverable messages are handled. If a dead-letter queue exists, add it to the document; if not, consider adding one.`,
        fingerprintKey: node.id,
      });
    }

    return drafts;
  },
};
