import { EVIDENCE_KIND_LABEL, type DemoEvidence } from "@/data/demo-architecture";

/**
 * One evidence row: the observation plus its visible source classification
 * (docs/design/DESIGN.md §15 requires the interface to distinguish these).
 */
export function EvidenceSource({ evidence }: { evidence: DemoEvidence }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border border-border bg-surface-muted p-2.5">
      <span className="type-label-caps shrink-0 border border-border-strong px-1.5 py-0.5 text-foreground-muted">
        {EVIDENCE_KIND_LABEL[evidence.kind]}
      </span>
      <span className="type-mono-data text-foreground">{evidence.text}</span>
    </li>
  );
}
