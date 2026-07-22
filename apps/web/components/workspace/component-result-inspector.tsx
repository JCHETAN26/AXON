"use client";

import {
  COMPONENT_KIND_LABEL,
  CONFIDENCE_LABEL,
  SIMULATION_DISCLAIMER,
  VALUE_BASIS_LABEL,
  type ComponentComparison,
  type ComponentResult,
  type ConfidenceLevel,
} from "@axon/architecture-simulation";
import { StatusBadge, type StatusKind } from "@axon/ui";

import { STATUS_KIND, STATUS_LABEL, formatRps } from "@/lib/simulation/simulation-view";

const CONFIDENCE_KIND: Record<ConfidenceLevel, StatusKind> = {
  high: "success",
  medium: "warning",
  low: "critical",
  "not-applicable": "neutral",
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="type-label-caps text-foreground-muted">{label}</h3>
      <div className="type-body-md mt-1.5">{children}</div>
    </div>
  );
}

export interface ComponentResultInspectorProps {
  component: ComponentResult;
  /** Baseline comparison for this component, when a comparison is available. */
  comparison?: ComponentComparison | undefined;
}

/**
 * Full evidence trail for one modeled component: what entered, what AXON
 * assumed, what it derived, what it projects, and what it does not model.
 */
export function ComponentResultInspector({ component, comparison }: ComponentResultInspectorProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge kind={STATUS_KIND[component.status]}>
          {STATUS_LABEL[component.status]}
        </StatusBadge>
        <StatusBadge kind="neutral">{COMPONENT_KIND_LABEL[component.kind]}</StatusBadge>
        <StatusBadge kind={CONFIDENCE_KIND[component.confidence]}>
          {CONFIDENCE_LABEL[component.confidence]}
        </StatusBadge>
      </div>

      <h2 className="type-headline-md">{component.name}</h2>

      <Section label="Confidence">
        <p className="text-foreground-muted">{component.confidenceRationale}</p>
      </Section>

      <Section label="Modeled load">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <dt className="type-mono-data text-foreground-muted">Inbound</dt>
          <dd className="type-mono-data">{formatRps(component.inboundRps)} rps</dd>
          <dt className="type-mono-data text-foreground-muted">Outbound</dt>
          <dd className="type-mono-data">{formatRps(component.outboundRps)} rps</dd>
          <dt className="type-mono-data text-foreground-muted">Estimated utilization</dt>
          <dd className="type-mono-data">{(component.utilization * 100).toFixed(1)}%</dd>
          {component.saturationRps !== null && (
            <>
              <dt className="type-mono-data text-foreground-muted">Projected limit at</dt>
              <dd className="type-mono-data">{formatRps(component.saturationRps)} rps</dd>
            </>
          )}
        </dl>
      </Section>

      {comparison?.utilizationDelta != null && (
        <Section label="Versus baseline">
          <p className="type-mono-data">
            {comparison.direction === "unchanged"
              ? "No change in estimated utilization"
              : `${comparison.utilizationDelta > 0 ? "+" : ""}${(
                  comparison.utilizationDelta * 100
                ).toFixed(1)} percentage points versus the baseline scenario`}
          </p>
        </Section>
      )}

      <Section label="Evidence">
        <ul className="flex flex-col gap-2">
          {component.evidence.map((item) => (
            <li key={item.label} className="flex flex-col">
              <span className="type-mono-data">
                {item.label}: {item.value}
              </span>
              <span className="type-label-caps text-foreground-muted">
                {VALUE_BASIS_LABEL[item.basis]}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section label="What this model does not represent">
        <ul className="flex list-disc flex-col gap-1.5 pl-4 text-foreground-muted">
          {component.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </Section>

      <p className="type-mono-data border-t-2 border-border pt-4 text-foreground-muted">
        {SIMULATION_DISCLAIMER} Requires production validation.
      </p>
    </div>
  );
}
