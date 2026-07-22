import { type NodeId } from "./demo-architecture";

/**
 * Deterministic traffic-simulation model for the landing demonstration.
 *
 * Constants come from the canonical audit evidence and node metrics:
 * PostgreSQL allows 300 connections and holds 82 at the 1,200 rps baseline;
 * Redis hits 97.2%; the worker pool runs 8 workers. Every output is a
 * deterministic estimate derived from supplied parameters — the interface
 * labels each value with its basis and never presents outcomes as production
 * benchmarks.
 */

export type MetricBasis = "measured" | "calculated" | "estimated" | "ai-inferred";

export const METRIC_BASIS_LABEL: Record<MetricBasis, string> = {
  measured: "Measured",
  calculated: "Calculated",
  estimated: "Estimated",
  "ai-inferred": "AI inference",
};

export const BASELINE_RPS = 1200;
export const PG_MAX_CONNECTIONS = 300;
/** Connections held per request/second, measured at baseline (82 @ 1,200 rps). */
export const CONNECTIONS_PER_RPS = 82 / BASELINE_RPS;
/** Saturation point under default assumptions. */
export const PG_SATURATION_RPS = Math.round(PG_MAX_CONNECTIONS / CONNECTIONS_PER_RPS);

/** Cache-hit rate measured at baseline (redis-cluster node metrics). */
export const DEFAULT_CACHE_HIT_PCT = 97.2;
export const MIN_CACHE_HIT_PCT = 80;
export const MAX_CACHE_HIT_PCT = 99;
/** Share of database work the cache can absorb; the rest always hits PostgreSQL. */
const CACHEABLE_DB_FRACTION = 0.6;

/** Worker pool size at baseline (worker-pool node metrics). */
export const DEFAULT_WORKERS = 8;
export const MIN_WORKERS = 2;
export const MAX_WORKERS = 24;
/** Share of requests that enqueue a background job. */
const JOB_FRACTION = 0.04;
/** Jobs each worker completes per second. */
const WORKER_THROUGHPUT_PER_SEC = 25;

/** Share of requests that traverse the payment path (fails during an outage). */
const PAYMENT_TRAFFIC_PCT = 4.5;

export const BASELINE_P95_MS = 180;
export const BASE_APP_REPLICAS = 6;
export const MAX_APP_REPLICAS = 24;

export const SIMULATION_MIN_RPS = 500;
export const SIMULATION_MAX_RPS = 25000;

export interface SimulationAssumptions {
  cacheHitPct: number;
  workers: number;
  stripeOutage: boolean;
}

export const DEFAULT_ASSUMPTIONS: SimulationAssumptions = {
  cacheHitPct: DEFAULT_CACHE_HIT_PCT,
  workers: DEFAULT_WORKERS,
  stripeOutage: false,
};

export interface SimulationScenario {
  id: string;
  label: string;
  rps: number;
  /** Short qualifier shown with the preset, e.g. "1× measured baseline". */
  note: string;
}

export const SIMULATION_SCENARIOS: readonly SimulationScenario[] = [
  { id: "current", label: "Current Traffic", rps: BASELINE_RPS, note: "1× measured baseline" },
  { id: "growth", label: "Steady Growth", rps: BASELINE_RPS * 3, note: "3× projected" },
  { id: "burst", label: "Black Friday Burst", rps: BASELINE_RPS * 10, note: "10× projected" },
];

export type SimulationStatus = "healthy" | "degraded" | "failing";

export interface SimulationOutcome {
  rps: number;
  assumptions: SimulationAssumptions;
  /** Connections actually held (capped at the configured maximum). */
  postgresConnections: number;
  /** Uncapped demand ratio against the connection limit; > 1 means saturated. */
  postgresUtilization: number;
  /** Traffic at which PostgreSQL saturates under the current assumptions. */
  pgSaturationRps: number;
  appReplicas: number;
  appReplicasCapped: boolean;
  queueJobsPerSec: number;
  workerCapacityPerSec: number;
  /** Jobs per second accumulating once demand exceeds worker throughput. */
  queueBacklogPerSec: number;
  /** Traffic at which the queue outruns the worker pool. */
  queueSaturationRps: number;
  p95Ms: number;
  errorRatePct: number;
  paymentPath: "ok" | "outage";
  status: SimulationStatus;
  /** The component projected to saturate first under the current assumptions. */
  firstConstraintNodeId: NodeId;
  firstConstraintRps: number;
}

export function computeSimulation(
  rps: number,
  overrides: Partial<SimulationAssumptions> = {},
): SimulationOutcome {
  const assumptions: SimulationAssumptions = { ...DEFAULT_ASSUMPTIONS, ...overrides };
  const { cacheHitPct, workers, stripeOutage } = assumptions;

  // Cache misses put reads back onto PostgreSQL.
  const baselineMissPct = 100 - DEFAULT_CACHE_HIT_PCT;
  const missRatio = (100 - cacheHitPct) / baselineMissPct;
  const dbPressureFactor = 1 - CACHEABLE_DB_FRACTION + CACHEABLE_DB_FRACTION * missRatio;

  const connectionDemand = rps * CONNECTIONS_PER_RPS * dbPressureFactor;
  const demand = connectionDemand / PG_MAX_CONNECTIONS;
  const postgresConnections = Math.min(PG_MAX_CONNECTIONS, Math.round(connectionDemand));
  const pgSaturationRps = Math.round(PG_MAX_CONNECTIONS / (CONNECTIONS_PER_RPS * dbPressureFactor));

  const appReplicas = Math.min(MAX_APP_REPLICAS, Math.max(BASE_APP_REPLICAS, Math.ceil(rps / 200)));

  const queueJobsPerSec = Math.round(rps * JOB_FRACTION);
  const workerCapacityPerSec = workers * WORKER_THROUGHPUT_PER_SEC;
  const queueBacklogPerSec = Math.max(0, queueJobsPerSec - workerCapacityPerSec);
  const queueSaturationRps = Math.round(workerCapacityPerSec / JOB_FRACTION);

  const p95Ms = Math.round(
    BASELINE_P95_MS * (1 + Math.max(0, demand - 0.5) * 1.2 + (demand > 1 ? (demand - 1) * 3 : 0)),
  );

  const structuralErrorPct =
    demand <= 0.9
      ? 0
      : demand <= 1
        ? Math.round((demand - 0.9) * 200) / 10
        : Math.min(38, Math.round((2 + (demand - 1) * 12) * 10) / 10);
  const errorRatePct = Math.min(
    45,
    Math.round((structuralErrorPct + (stripeOutage ? PAYMENT_TRAFFIC_PCT : 0)) * 10) / 10,
  );

  const pgExceeded = demand >= 1;
  const queueExceeded = queueBacklogPerSec > 0;
  const status: SimulationStatus =
    pgExceeded || queueExceeded
      ? "failing"
      : demand >= 0.75 || stripeOutage
        ? "degraded"
        : "healthy";

  const postgresFirst = pgSaturationRps <= queueSaturationRps;

  return {
    rps,
    assumptions,
    postgresConnections,
    postgresUtilization: demand,
    pgSaturationRps,
    appReplicas,
    appReplicasCapped: appReplicas >= MAX_APP_REPLICAS,
    queueJobsPerSec,
    workerCapacityPerSec,
    queueBacklogPerSec,
    queueSaturationRps,
    p95Ms,
    errorRatePct,
    paymentPath: stripeOutage ? "outage" : "ok",
    status,
    firstConstraintNodeId: postgresFirst ? "postgres" : "rabbitmq",
    firstConstraintRps: Math.min(pgSaturationRps, queueSaturationRps),
  };
}

export function formatRps(rps: number): string {
  return rps >= 1000 ? `${(rps / 1000).toFixed(1)}k` : `${rps}`;
}
