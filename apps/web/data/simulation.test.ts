import { describe, expect, it } from "vitest";

import {
  BASELINE_RPS,
  MAX_APP_REPLICAS,
  PG_MAX_CONNECTIONS,
  PG_SATURATION_RPS,
  SIMULATION_SCENARIOS,
  computeSimulation,
  formatRps,
} from "./simulation";

describe("computeSimulation", () => {
  it("reports the measured baseline as healthy", () => {
    const outcome = computeSimulation(BASELINE_RPS);
    expect(outcome.status).toBe("healthy");
    expect(outcome.postgresConnections).toBe(82);
    expect(outcome.appReplicas).toBe(6);
    expect(outcome.errorRatePct).toBe(0);
    expect(outcome.queueBacklogPerSec).toBe(0);
  });

  it("degrades before it fails as traffic rises", () => {
    expect(computeSimulation(BASELINE_RPS * 3).status).toBe("degraded");
    expect(computeSimulation(BASELINE_RPS * 10).status).toBe("failing");
  });

  it("projects PostgreSQL as the first constraint from the audit evidence", () => {
    expect(PG_SATURATION_RPS).toBeGreaterThan(4000);
    expect(PG_SATURATION_RPS).toBeLessThan(5000);
    const outcome = computeSimulation(BASELINE_RPS * 10);
    expect(outcome.firstConstraintNodeId).toBe("postgres");
    expect(outcome.postgresConnections).toBe(PG_MAX_CONNECTIONS);
    expect(outcome.queueBacklogPerSec).toBeGreaterThan(0);
    expect(outcome.appReplicasCapped).toBe(true);
    expect(outcome.appReplicas).toBe(MAX_APP_REPLICAS);
  });

  it("produces monotonically non-decreasing latency with load", () => {
    let previous = 0;
    for (const rps of [500, 1200, 3600, 4400, 8000, 12000, 25000]) {
      const { p95Ms } = computeSimulation(rps);
      expect(p95Ms).toBeGreaterThanOrEqual(previous);
      previous = p95Ms;
    }
  });

  it("bounds the error rate", () => {
    expect(computeSimulation(25000).errorRatePct).toBeLessThanOrEqual(45);
  });

  it("increases database pressure as the cache-hit rate drops", () => {
    const baseline = computeSimulation(BASELINE_RPS);
    const coldCache = computeSimulation(BASELINE_RPS, { cacheHitPct: 85 });
    expect(coldCache.postgresConnections).toBeGreaterThan(baseline.postgresConnections);
    expect(coldCache.pgSaturationRps).toBeLessThan(baseline.pgSaturationRps);
  });

  it("scales queue lag with worker throughput", () => {
    const burst = computeSimulation(BASELINE_RPS * 10);
    const moreWorkers = computeSimulation(BASELINE_RPS * 10, { workers: 24 });
    expect(moreWorkers.queueBacklogPerSec).toBeLessThan(burst.queueBacklogPerSec);

    const starved = computeSimulation(BASELINE_RPS * 3, { workers: 2 });
    expect(starved.queueBacklogPerSec).toBeGreaterThan(0);
    expect(starved.status).toBe("failing");
    expect(starved.firstConstraintNodeId).toBe("rabbitmq");
  });

  it("degrades the payment path during a Stripe outage", () => {
    const baseline = computeSimulation(BASELINE_RPS);
    const outage = computeSimulation(BASELINE_RPS, { stripeOutage: true });
    expect(outage.paymentPath).toBe("outage");
    expect(outage.errorRatePct).toBeGreaterThan(baseline.errorRatePct);
    expect(outage.status).toBe("degraded");
  });

  it("provides distinct scenario presets including the measured baseline", () => {
    expect(SIMULATION_SCENARIOS.length).toBeGreaterThanOrEqual(3);
    expect(SIMULATION_SCENARIOS[0]?.rps).toBe(BASELINE_RPS);
    expect(new Set(SIMULATION_SCENARIOS.map((scenario) => scenario.rps)).size).toBe(
      SIMULATION_SCENARIOS.length,
    );
  });

  it("formats traffic values compactly", () => {
    expect(formatRps(900)).toBe("900");
    expect(formatRps(12000)).toBe("12.0k");
  });
});
