import { Button, StatusBadge } from "@axon/ui";

import { SEVERITY_LABEL, SEVERITY_TO_KIND } from "./audit-finding-marker";
import { EvidenceSource } from "./evidence-source";
import { FindingConfidence } from "./finding-confidence";
import { getNode, type DemoFinding } from "@/data/demo-architecture";

export interface AuditEvidencePanelProps {
  finding: DemoFinding;
  /** id of the tab that labels this panel. */
  labelledBy: string;
}

export function AuditEvidencePanel({ finding, labelledBy }: AuditEvidencePanelProps) {
  const node = getNode(finding.nodeId);
  return (
    <div
      role="tabpanel"
      id="audit-evidence-panel"
      aria-labelledby={labelledBy}
      tabIndex={0}
      className="border-2 border-border-strong bg-surface p-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <p className="type-label-caps text-foreground-muted">Audit evidence</p>
      <h3 className="type-headline-md mt-2 text-balance">{finding.title}</h3>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <StatusBadge kind={SEVERITY_TO_KIND[finding.severity]}>
          {SEVERITY_LABEL[finding.severity]}
        </StatusBadge>
        <span className="type-mono-data text-foreground-muted">node: {node.name}</span>
        <FindingConfidence value={finding.confidence} />
      </div>
      <p className="type-body-md mt-4 text-foreground-muted">{finding.explanation}</p>
      <div className="mt-6">
        <p className="type-label-caps text-foreground-muted">Evidence</p>
        <ul className="mt-3 flex flex-col gap-2">
          {finding.evidence.map((evidence) => (
            <EvidenceSource key={evidence.text} evidence={evidence} />
          ))}
        </ul>
      </div>
      <div className="mt-6 border-l-2 border-accent pl-4">
        <p className="type-label-caps text-foreground-muted">Recommendation</p>
        <p className="type-body-md mt-2">{finding.recommendation}</p>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="technical" size="sm" disabled>
          Preview Change
        </Button>
        <Button variant="technical" size="sm" disabled>
          View Evidence
        </Button>
        <span className="type-mono-data text-foreground-muted">
          Available in the product workspace
        </span>
      </div>
    </div>
  );
}
