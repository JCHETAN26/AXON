import { cx } from "@axon/ui";

import { getNode } from "@/data/demo-architecture";
import {
  MAX_APP_REPLICAS,
  PG_MAX_CONNECTIONS,
  formatRps,
  type SimulationOutcome,
} from "@/data/simulation";

function LoadBar({ fraction, critical }: { fraction: number; critical: boolean }) {
  return (
    <span
      aria-hidden
      className="mt-2 block h-2 w-full border border-border-strong bg-surface-subtle"
    >
      <span
        className={cx(
          "block h-full transition-[width] motion-safe:duration-(--duration-standard)",
          critical ? "bg-critical" : "bg-accent",
        )}
        style={{ width: `${Math.min(100, Math.round(fraction * 100))}%` }}
      />
    </span>
  );
}

function CanvasNode({
  nodeId,
  detail,
  bar,
  critical = false,
  statusLabel,
}: {
  nodeId: Parameters<typeof getNode>[0];
  detail: string;
  bar?: number;
  critical?: boolean;
  statusLabel?: string;
}) {
  const node = getNode(nodeId);
  return (
    <div
      className={cx(
        "min-w-44 flex-1 border-2 bg-surface p-3",
        critical ? "border-critical" : "border-border-strong",
      )}
    >
      <p className="type-label-caps text-foreground-muted">{node.category}</p>
      <p className="type-mono-data mt-1 text-foreground">{node.name}</p>
      <p className="type-mono-data mt-1 text-foreground-muted">{detail}</p>
      {bar !== undefined && <LoadBar fraction={bar} critical={critical} />}
      {statusLabel !== undefined && (
        <p className={cx("type-label-caps mt-2", critical ? "text-critical" : "text-success")}>
          {statusLabel}
        </p>
      )}
    </div>
  );
}

function FlowArrow() {
  return (
    <span aria-hidden className="type-mono-data self-center text-foreground-muted">
      →
    </span>
  );
}

/**
 * The simulated request path from the canonical architecture, with load
 * rendered per component.
 */
export function SimulationCanvas({ outcome }: { outcome: SimulationOutcome }) {
  const saturated = outcome.postgresUtilization >= 1;
  return (
    <div className="bg-canvas-grid border border-border p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
        <CanvasNode nodeId="gateway" detail={`in ${formatRps(outcome.rps)} rps`} />
        <FlowArrow />
        <CanvasNode
          nodeId="app"
          detail={`${outcome.appReplicas}/${MAX_APP_REPLICAS} replicas${outcome.appReplicasCapped ? " · at max" : ""}`}
          bar={outcome.appReplicas / MAX_APP_REPLICAS}
        />
        <FlowArrow />
        <CanvasNode
          nodeId="postgres"
          detail={`conn ${outcome.postgresConnections}/${PG_MAX_CONNECTIONS} · ${Math.round(outcome.postgresUtilization * 100)}%`}
          bar={outcome.postgresUtilization}
          critical={saturated}
          statusLabel={saturated ? "Saturated" : "Within limits"}
        />
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="type-mono-data text-foreground-muted">
            {getNode("rabbitmq").name} → worker-pool ×{outcome.assumptions.workers} · capacity{" "}
            {outcome.workerCapacityPerSec}/s · backlog{" "}
            {outcome.queueBacklogPerSec > 0 ? `+${outcome.queueBacklogPerSec}/s` : "none"}
          </span>
          {outcome.queueBacklogPerSec > 0 && (
            <span className="type-label-caps text-critical">
              <span aria-hidden>▲ </span>growing
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="type-mono-data text-foreground-muted">
            {getNode("payments").name} → {getNode("stripe").name}:{" "}
            {outcome.paymentPath === "ok" ? "ok" : "unreachable"}
          </span>
          {outcome.paymentPath === "outage" && (
            <span className="type-label-caps text-critical">
              <span aria-hidden>▲ </span>Outage
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
