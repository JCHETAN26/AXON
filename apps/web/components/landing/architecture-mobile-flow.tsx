import { ArchitectureNode, StatusBadge } from "@axon/ui";

import { SEVERITY_LABEL, SEVERITY_TO_KIND } from "./audit-finding-marker";
import { EDGE_KIND_LABEL } from "./architecture-edge";
import {
  FOCUS_FLOW,
  findEdge,
  getNode,
  type DemoFinding,
  type NodeId,
} from "@/data/demo-architecture";

function FlowConnector({ source, target }: { source: NodeId; target: NodeId }) {
  const edge = findEdge(source, target);
  return (
    <div className="flex items-center justify-center gap-2 py-1" aria-hidden>
      <svg width={8} height={28} className="shrink-0">
        <line x1={4} y1={0} x2={4} y2={20} strokeWidth={1.5} className="stroke-accent" />
        <path d="M0.5,20 L4,26 L7.5,20 Z" className="fill-accent" />
      </svg>
      {edge !== undefined && (
        <span className="type-mono-data text-foreground-muted">{EDGE_KIND_LABEL[edge.kind]}</span>
      )}
    </div>
  );
}

export interface ArchitectureMobileFlowProps {
  revealedFindings: readonly DemoFinding[];
  auditStarted: boolean;
}

/**
 * Small-viewport variant of the hero canvas: the focused request flow as a
 * vertical chain, with audit findings listed below instead of overlaid.
 */
export function ArchitectureMobileFlow({
  revealedFindings,
  auditStarted,
}: ArchitectureMobileFlowProps) {
  return (
    <div className="bg-canvas-grid p-4 md:hidden">
      <ol aria-label="Primary request flow" className="flex flex-col">
        {FOCUS_FLOW.map((nodeId, index) => {
          const node = getNode(nodeId);
          const previousId = index > 0 ? FOCUS_FLOW[index - 1] : undefined;
          return (
            <li key={node.id} className="flex flex-col">
              {previousId !== undefined && <FlowConnector source={previousId} target={node.id} />}
              <ArchitectureNode
                category={node.category}
                name={node.name}
                meta={node.metrics}
                className="w-full"
              />
            </li>
          );
        })}
      </ol>
      <div className="mt-6 border border-border bg-surface p-4">
        <p className="type-label-caps text-foreground-muted">Audit findings</p>
        {revealedFindings.length === 0 ? (
          <p className="type-mono-data mt-3 text-foreground-muted">
            {auditStarted ? "Scanning architecture…" : "Run the audit to reveal findings."}
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {revealedFindings.map((finding) => (
              <li key={finding.id} className="flex flex-col gap-1">
                <StatusBadge kind={SEVERITY_TO_KIND[finding.severity]} className="self-start">
                  {SEVERITY_LABEL[finding.severity]}
                </StatusBadge>
                <p className="type-body-md">{finding.title}</p>
                <p className="type-mono-data text-foreground-muted">
                  {getNode(finding.nodeId).name}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
