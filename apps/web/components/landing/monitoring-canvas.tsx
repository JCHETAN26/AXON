import { cx } from "@axon/ui";

import { MetricOverlay } from "./metric-overlay";
import { getNode } from "@/data/demo-architecture";
import { type MonitoringStep, type NodeHealth } from "@/data/monitoring";

const HEALTH_META: Record<NodeHealth, { label: string; glyph: string; textClass: string }> = {
  healthy: { label: "Healthy", glyph: "●", textClass: "text-success" },
  degraded: { label: "Degraded", glyph: "▲", textClass: "text-warning" },
  critical: { label: "Critical", glyph: "▲", textClass: "text-critical" },
};

/** Runtime metrics overlaid directly on the monitored architecture nodes. */
export function MonitoringCanvas({ step }: { step: MonitoringStep }) {
  const affectedNodeId = step.incident?.affectedNodeId;
  return (
    <ul className="bg-canvas-grid grid grid-cols-1 gap-3 border border-border p-4 sm:grid-cols-2 xl:grid-cols-3">
      {step.samples.map((sample) => {
        const node = getNode(sample.nodeId);
        const health = HEALTH_META[sample.health];
        const affected = sample.nodeId === affectedNodeId;
        return (
          <li
            key={sample.nodeId}
            className={cx(
              "border-2 bg-surface p-3 transition-colors",
              "motion-safe:duration-(--duration-standard) motion-reduce:transition-none",
              sample.health === "critical" && "border-critical",
              sample.health === "degraded" && "border-warning",
              sample.health === "healthy" && "border-border-strong",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="type-label-caps text-foreground-muted">{node.category}</p>
                <p className="type-mono-data truncate text-foreground">{node.name}</p>
              </div>
              <p className={cx("type-label-caps shrink-0", health.textClass)}>
                <span aria-hidden>{health.glyph} </span>
                {health.label}
              </p>
            </div>
            <MetricOverlay metrics={sample.metrics} />
            {affected && (
              <p className="type-label-caps mt-2 text-critical">
                <span aria-hidden>▸ </span>Active incident
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
