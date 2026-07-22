"use client";

import { type AuditFinding } from "@axon/architecture-audit";
import {
  type Applicability,
  type DocumentDiff,
  type Recommendation,
} from "@axon/architecture-recommendations";
import { Button, StatusBadge } from "@axon/ui";

const STATUS_TEXT: Record<Applicability["status"], string> = {
  ready: "Can be previewed and applied",
  "already-applied": "Already applied",
  stale: "Audit rerun required",
  conflicted: "Cannot be applied",
  "manual-review": "Manual review required",
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="type-label-caps text-foreground-muted">{label}</h3>
      <div className="type-body-md mt-1.5">{children}</div>
    </div>
  );
}

export interface ChangeInspectorProps {
  recommendation: Recommendation;
  applicability: Applicability;
  finding: AuditFinding | undefined;
  diff: DocumentDiff | null;
  onRequestApply: () => void;
}

/**
 * Evidence-linked view of one proposed change: which finding triggered it,
 * what changes, why, what effect is expected, and what assumptions apply.
 */
export function ChangeInspector({
  recommendation,
  applicability,
  finding,
  diff,
  onRequestApply,
}: ChangeInspectorProps) {
  const isManual = recommendation.mode === "manual-review";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          kind={
            applicability.status === "ready"
              ? "info"
              : applicability.status === "already-applied"
                ? "success"
                : applicability.status === "manual-review"
                  ? "neutral"
                  : "warning"
          }
        >
          {STATUS_TEXT[applicability.status]}
        </StatusBadge>
      </div>

      <h2 className="type-headline-md">{recommendation.title}</h2>

      <Section label="Triggered by">
        {finding === undefined ? (
          <p className="text-foreground-muted">
            The source finding is no longer in the current audit.
          </p>
        ) : (
          <p>{finding.title}</p>
        )}
      </Section>

      <Section label="Proposed change">
        <p>{recommendation.proposedChange}</p>
      </Section>

      <Section label="Why">
        <p>{recommendation.rationale}</p>
      </Section>

      {recommendation.operations.length > 0 && (
        <Section label={`Architecture-document operations (${recommendation.operations.length})`}>
          <ul className="flex flex-col gap-1.5">
            {recommendation.operations.map((item) => (
              <li key={item.fingerprint} className="type-mono-data">
                {item.description}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section label="Elements affected">
        <p className="type-mono-data">{recommendation.elementIds.join(", ")}</p>
      </Section>

      <Section label="Expected effect">
        <p>{recommendation.expectedEffect}</p>
      </Section>

      {diff !== null && (
        <Section label="Preview summary">
          <p className="type-mono-data">
            {diff.addedCount} added · {diff.modifiedCount} modified · {diff.removedCount} removed
          </p>
        </Section>
      )}

      <Section label="Assumptions and limitations">
        <ul className="flex list-disc flex-col gap-1.5 pl-4 text-foreground-muted">
          {recommendation.assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
      </Section>

      {applicability.reasons.length > 0 && (
        <Section label="Why AXON will not apply this">
          <ul className="flex list-disc flex-col gap-1.5 pl-4">
            {applicability.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </Section>
      )}

      <div className="flex flex-col gap-3 border-t-2 border-border pt-4">
        {/* Manual-review changes never expose an enabled apply action. */}
        {isManual ? (
          <p className="type-body-md text-foreground-muted">
            AXON does not apply this change automatically. Make the change on the canvas, then rerun
            the audit.
          </p>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={onRequestApply}
            disabled={!applicability.canApply}
            className="self-start"
          >
            Review and Apply
          </Button>
        )}
        <p className="type-mono-data text-foreground-muted">
          Preview only · applying updates the AXON architecture model. Implementation still requires
          engineering review.
        </p>
      </div>
    </div>
  );
}
