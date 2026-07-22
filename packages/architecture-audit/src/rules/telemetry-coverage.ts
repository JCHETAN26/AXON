import { type AuditRule, type FindingDraft } from "../types";

/**
 * Flags the document — one aggregate finding, not one per node — when
 * components that are not marked planned have no outgoing telemetry
 * connection. Telemetry sinks (nodes receiving telemetry) count as covered.
 *
 * The fingerprint key is pinned to the document scope so acknowledging the
 * coverage gap survives edits that merely change which nodes are listed.
 */
export const telemetryCoverageRule: AuditRule = {
  id: "telemetry-coverage",
  version: "1.0.0",
  description:
    "Flags components that are not marked planned and have no represented telemetry path.",
  evaluate({ document }) {
    const activeNodes = document.nodes.filter((node) => node.planned !== true);
    if (activeNodes.length === 0) return [];

    const telemetryEdges = document.edges.filter((edge) => edge.kind === "telemetry");
    const sinkIds = new Set(telemetryEdges.map((edge) => edge.target));
    const sourceIds = new Set(telemetryEdges.map((edge) => edge.source));

    const uncovered = activeNodes.filter(
      (node) => !sourceIds.has(node.id) && !sinkIds.has(node.id),
    );
    if (uncovered.length === 0) return [];

    const uncoveredNames = uncovered.map((node) => `"${node.name}"`).join(", ");
    const coveredSourceNames = activeNodes
      .filter((node) => sourceIds.has(node.id))
      .map((node) => `"${node.name}"`)
      .join(", ");

    const draft: FindingDraft = {
      severity: "low",
      title: `Telemetry is not represented for ${String(uncovered.length)} of ${String(activeNodes.length)} components`,
      detected: `${String(uncovered.length)} of ${String(activeNodes.length)} components that are not marked planned have no outgoing telemetry connection in the architecture document: ${uncoveredNames}.`,
      elementIds: uncovered.map((node) => node.id),
      evidence: [
        {
          text:
            telemetryEdges.length === 0
              ? "No telemetry connections are represented in the document."
              : `Telemetry connections are represented from: ${coveredSourceNames}.`,
          elementIds: telemetryEdges.map((edge) => edge.id),
        },
        {
          text: `No telemetry connection leaves: ${uncoveredNames}.`,
          elementIds: uncovered.map((node) => node.id),
        },
      ],
      inference:
        "Based on the current architecture document, incidents in the listed components would not be observable through any represented telemetry path.",
      limitation:
        "Platform monitoring, agents, or log pipelines that are not drawn as telemetry connections are invisible to this rule. Absence from the document is not proof that a component is unmonitored.",
      recommendation:
        "Review which of the listed components are monitored in production, and represent those telemetry paths in the document.",
      fingerprintKey: "document",
    };

    return [draft];
  },
};
