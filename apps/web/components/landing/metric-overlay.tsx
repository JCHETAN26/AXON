import { type OverlayMetric } from "@/data/monitoring";

/** Compact metric rows overlaid on a monitored node (DESIGN §17). */
export function MetricOverlay({ metrics }: { metrics: readonly OverlayMetric[] }) {
  return (
    <dl className="mt-2 flex flex-col gap-0.5">
      {metrics.map((metric) => (
        <div key={metric.label} className="flex items-baseline justify-between gap-3">
          <dt className="type-mono-data text-foreground-muted">{metric.label}</dt>
          <dd className="type-mono-data text-foreground">{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}
