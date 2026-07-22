import { MetricReadout } from "./metric-readout";
import { getNode } from "@/data/demo-architecture";
import { BASELINE_RPS, formatRps, type SimulationOutcome } from "@/data/simulation";

const STATUS_TEXT: Record<SimulationOutcome["status"], string> = {
  healthy: "HEALTHY · all components within limits",
  degraded: "DEGRADED · approaching the first constraint",
  failing: "FAILING · first constraint exceeded",
};

export function SimulationResult({ outcome }: { outcome: SimulationOutcome }) {
  const constraintNode = getNode(outcome.firstConstraintNodeId);
  return (
    <div>
      <p
        role="status"
        aria-live="polite"
        aria-label="Simulation status"
        className="type-mono-data text-foreground"
      >
        {STATUS_TEXT[outcome.status]} · {formatRps(outcome.rps)} rps
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <MetricReadout
          label="p95 latency"
          value={`${outcome.p95Ms}ms`}
          basis={outcome.rps === BASELINE_RPS ? "measured" : "estimated"}
        />
        <MetricReadout
          label="Error rate"
          value={`${outcome.errorRatePct.toFixed(1)}%`}
          basis="estimated"
          alert={outcome.errorRatePct > 1}
        />
        <MetricReadout
          label="Queue backlog"
          value={outcome.queueBacklogPerSec > 0 ? `+${outcome.queueBacklogPerSec}/s` : "0"}
          basis="estimated"
          alert={outcome.queueBacklogPerSec > 0}
        />
        <MetricReadout
          label="DB connections"
          value={`${outcome.postgresConnections}`}
          basis="calculated"
          alert={outcome.postgresUtilization >= 1}
        />
        <MetricReadout label="App replicas" value={`${outcome.appReplicas}`} basis="calculated" />
        <MetricReadout label="Baseline traffic" value={formatRps(BASELINE_RPS)} basis="measured" />
      </div>
      <div className="mt-4 border-l-2 border-accent pl-4">
        <p className="type-label-caps text-foreground-muted">First projected constraint</p>
        <p className="type-body-md mt-1">
          <span className="font-mono">{constraintNode.name}</span> saturates at ≈
          {formatRps(outcome.firstConstraintRps)} rps under the current assumptions, derived
          deterministically from its configured limits.{" "}
          <a
            href="#architecture-audit"
            className="text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            View the audit finding
          </a>
        </p>
      </div>
      <p className="type-mono-data mt-4 text-foreground-muted">
        Estimated from supplied architecture parameters—not a production benchmark.
      </p>
    </div>
  );
}
