import { StatusBadge, type StatusKind } from "@axon/ui";

import { type DemoFinding, type FindingSeverity } from "@/data/demo-architecture";

export const SEVERITY_TO_KIND: Record<FindingSeverity, StatusKind> = {
  critical: "critical",
  high: "critical",
  medium: "warning",
  healthy: "success",
};

export const SEVERITY_LABEL: Record<FindingSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  healthy: "Verified",
};

/**
 * Canvas overlay marker for one revealed audit finding. Severity is always
 * communicated by the badge icon and text, never by color alone.
 */
export function AuditFindingMarker({ finding }: { finding: DemoFinding }) {
  return (
    <span className="motion-safe:animate-finding-reveal absolute -top-3 -right-2 z-30">
      <StatusBadge
        kind={SEVERITY_TO_KIND[finding.severity]}
        className="shadow-[2px_2px_0_0_var(--color-border)]"
      >
        {finding.code} · {SEVERITY_LABEL[finding.severity]}
      </StatusBadge>
      <span className="sr-only">{finding.title}</span>
    </span>
  );
}
