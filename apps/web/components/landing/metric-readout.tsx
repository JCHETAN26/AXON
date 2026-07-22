import { cx } from "@axon/ui";

import { METRIC_BASIS_LABEL, type MetricBasis } from "@/data/simulation";

export interface MetricReadoutProps {
  label: string;
  value: string;
  basis: MetricBasis;
  /** Marks the value as breaching a limit; adds a warning glyph, not just color. */
  alert?: boolean;
}

export function MetricReadout({ label, value, basis, alert = false }: MetricReadoutProps) {
  return (
    <div className="border border-border bg-surface p-3">
      <p className="type-label-caps text-foreground-muted">{label}</p>
      <p
        className={cx(
          "mt-1 font-mono text-lg font-medium",
          alert ? "text-critical" : "text-foreground",
        )}
      >
        {value}
        {alert && (
          <>
            <span aria-hidden> ▲</span>
            <span className="sr-only"> (limit exceeded)</span>
          </>
        )}
      </p>
      <p className="type-label-caps mt-2 inline-block border border-border-strong px-1.5 py-0.5 text-foreground-muted">
        {METRIC_BASIS_LABEL[basis]}
      </p>
    </div>
  );
}
