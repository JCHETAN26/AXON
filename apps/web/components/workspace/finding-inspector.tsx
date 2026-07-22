"use client";

import { type AuditFinding } from "@axon/architecture-audit";
import { type ArchitectureDocument } from "@axon/diagram-schema";
import { Button, StatusBadge } from "@axon/ui";

import { SEVERITY_STATUS_KIND } from "@/lib/audit/run-project-audit";

/** Resolves an element id to something a human recognizes. */
function describeElement(document: ArchitectureDocument, elementId: string): string {
  const node = document.nodes.find((candidate) => candidate.id === elementId);
  if (node !== undefined) return node.name;
  const edge = document.edges.find((candidate) => candidate.id === elementId);
  if (edge !== undefined) {
    const sourceName =
      document.nodes.find((candidate) => candidate.id === edge.source)?.name ?? edge.source;
    const targetName =
      document.nodes.find((candidate) => candidate.id === edge.target)?.name ?? edge.target;
    return `${sourceName} → ${targetName} (${edge.kind})`;
  }
  // Elements deleted since the audit ran keep their raw id.
  return `${elementId} (no longer in the document)`;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="type-label-caps text-foreground-muted">{label}</h3>
      <div className="type-body-md mt-1.5">{children}</div>
    </div>
  );
}

const STATE_LABEL: Record<AuditFinding["state"], string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
};

export interface FindingInspectorProps {
  finding: AuditFinding;
  document: ArchitectureDocument;
  onAcknowledge: () => void;
  onReopen: () => void;
}

/**
 * Full evidence trail for one finding: what was detected, from which
 * elements, what AXON inferred, what the rule cannot see, and what to review.
 */
export function FindingInspector({
  finding,
  document,
  onAcknowledge,
  onReopen,
}: FindingInspectorProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge kind={SEVERITY_STATUS_KIND[finding.severity]}>{finding.severity}</StatusBadge>
        <StatusBadge kind={finding.state === "resolved" ? "success" : "neutral"}>
          {STATE_LABEL[finding.state]}
        </StatusBadge>
      </div>

      <h2 className="type-headline-md">{finding.title}</h2>

      <Section label="What AXON detected">
        <p>{finding.detected}</p>
      </Section>

      <Section label="Affected elements">
        <ul className="flex flex-col gap-1">
          {finding.elementIds.map((elementId) => (
            <li key={elementId} className="type-mono-data">
              {describeElement(document, elementId)}
            </li>
          ))}
        </ul>
      </Section>

      <Section label="Evidence">
        <ul className="flex list-disc flex-col gap-1.5 pl-4">
          {finding.evidence.map((item) => (
            <li key={item.text}>{item.text}</li>
          ))}
        </ul>
      </Section>

      <Section label="What AXON inferred">
        <p>{finding.inference}</p>
      </Section>

      <Section label="Limitation of this rule">
        <p className="text-foreground-muted">{finding.limitation}</p>
      </Section>

      <Section label="Recommended review">
        <p>{finding.recommendation}</p>
      </Section>

      <div className="flex flex-wrap items-center gap-3 border-t-2 border-border pt-4">
        {finding.state === "open" && (
          <Button variant="technical" size="sm" onClick={onAcknowledge}>
            Acknowledge
          </Button>
        )}
        {finding.state === "acknowledged" && (
          <Button variant="technical" size="sm" onClick={onReopen}>
            Reopen
          </Button>
        )}
        <p className="type-mono-data text-foreground-muted">
          {finding.ruleId} v{finding.ruleVersion} · {finding.fingerprint}
        </p>
      </div>

      <p className="type-mono-data text-foreground-muted">
        Deterministic analysis · based on the current architecture document
      </p>
    </div>
  );
}
