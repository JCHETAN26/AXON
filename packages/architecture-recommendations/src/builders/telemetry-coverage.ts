import { type PatchOperation } from "../patch";
import { type RecommendationBuilder } from "../types";

/**
 * Connects components with no represented telemetry to an existing telemetry
 * sink. When no sink exists, AXON will not invent a monitoring vendor — that
 * becomes a manual-review recommendation.
 */
export const telemetryCoverageBuilder: RecommendationBuilder = {
  id: "connect-telemetry-coverage",
  version: "1.0.0",
  ruleId: "telemetry-coverage",
  build({ finding, document, index }) {
    const uncoveredIds = finding.elementIds.filter((id) => index.nodesById.has(id));
    if (uncoveredIds.length === 0) return null;

    // A sink is any node that already receives telemetry. Sorted so the choice
    // is deterministic when an architecture has more than one.
    const sinkIds = [
      ...new Set(
        document.edges.filter((edge) => edge.kind === "telemetry").map((edge) => edge.target),
      ),
    ].sort();
    const sinkId = sinkIds[0];

    if (sinkId === undefined) {
      return {
        title: "Represent a telemetry path for the architecture",
        proposedChange:
          "Add a telemetry destination and connect the listed components to it. AXON does not choose a monitoring destination automatically.",
        rationale:
          "The audit found components with no represented telemetry path, and the document contains no telemetry destination to connect them to.",
        expectedEffect:
          "Once a telemetry destination is represented, AXON can propose the connections automatically.",
        assumptions: [
          "AXON will not invent a monitoring vendor or platform. Choosing where telemetry goes is an engineering decision.",
          "Components may be monitored in production through agents or platform tooling that the document does not represent.",
        ],
        mode: "manual-review",
        operations: [],
      };
    }

    const sink = index.nodesById.get(sinkId);
    const targets = [...uncoveredIds].sort();
    const operations: PatchOperation[] = targets.map((nodeId) => ({
      type: "add-edge",
      edge: {
        id: `${nodeId}--${sinkId}--telemetry`,
        source: nodeId,
        target: sinkId,
        kind: "telemetry",
      },
    }));

    return {
      title: `Connect ${String(targets.length)} component${targets.length === 1 ? "" : "s"} to "${sink?.name ?? sinkId}"`,
      proposedChange: `Add telemetry connections from ${String(targets.length)} component${targets.length === 1 ? "" : "s"} to the existing telemetry destination "${sink?.name ?? sinkId}".`,
      rationale:
        "The audit found components with no represented telemetry path, so incidents in them would not be observable through anything the document represents.",
      expectedEffect:
        "The AXON architecture model will represent telemetry coverage for the listed components, and the coverage finding will resolve on the next audit run.",
      assumptions: [
        `Assumes every listed component can report to "${sink?.name ?? sinkId}". AXON reads the document only and cannot confirm that an agent or integration exists.`,
        "Drawing a telemetry connection documents intent; it does not configure monitoring.",
        "This is an architecture-document change. Implementation still requires engineering review.",
      ],
      mode: "automatic",
      operations,
    };
  },
};
