import { describe, expect, it } from "vitest";

import { resolveCapacity } from "./capacity-profile";
import { evaluateComponent } from "./evaluators";

describe("evaluateComponent", () => {
  it("models a service against total replica throughput", () => {
    // 6 replicas × 200 rps = 1,200 rps capacity.
    const result = evaluateComponent("service", {
      inboundRps: 600,
      capacity: resolveCapacity("service", undefined),
    });
    expect(result.utilization).toBeCloseTo(0.5);
    expect(result.outboundRps).toBe(600);
  });

  it("passes only cache misses downstream", () => {
    const result = evaluateComponent("cache", {
      inboundRps: 1000,
      capacity: resolveCapacity("cache", { cacheHitPercent: 90 }),
    });
    expect(result.outboundRps).toBeCloseTo(100);
    expect(result.evidence.find((item) => item.label === "Cache hit rate")).toMatchObject({
      basis: "user-input",
    });
  });

  it("models a database on connection pressure", () => {
    // 1,200 rps × (82/1200) = 82 connections against a limit of 300.
    const result = evaluateComponent("database", {
      inboundRps: 1200,
      capacity: resolveCapacity("database", undefined),
    });
    expect(result.utilization).toBeCloseTo(82 / 300);
    expect(
      result.evidence.find((item) => item.label === "Estimated connections held"),
    ).toMatchObject({ value: "82", basis: "projected" });
  });

  it("models a worker pool on drain capacity", () => {
    // 8 workers × 25 jobs/s = 200 jobs/s.
    const result = evaluateComponent("worker", {
      inboundRps: 100,
      capacity: resolveCapacity("worker", undefined),
    });
    expect(result.utilization).toBeCloseTo(0.5);
  });

  it("gives unmodeled components zero utilization and says so", () => {
    const result = evaluateComponent("unmodeled", {
      inboundRps: 500,
      capacity: resolveCapacity("unmodeled", undefined),
    });
    expect(result.utilization).toBe(0);
    // Load still flows through so downstream components are not starved.
    expect(result.outboundRps).toBe(500);
    expect(result.evidence[0]).toMatchObject({ basis: "unmodeled" });
  });

  it("labels defaults and user input distinctly", () => {
    const withDefaults = evaluateComponent("service", {
      inboundRps: 100,
      capacity: resolveCapacity("service", undefined),
    });
    expect(withDefaults.evidence.find((item) => item.label === "Units")?.basis).toBe(
      "axon-default",
    );

    const withOverride = evaluateComponent("service", {
      inboundRps: 100,
      capacity: resolveCapacity("service", { units: 12 }),
    });
    expect(withOverride.evidence.find((item) => item.label === "Units")?.basis).toBe("user-input");
  });

  it("states a limitation for every modeled kind", () => {
    for (const kind of ["service", "cache", "database", "queue", "worker", "external"] as const) {
      const result = evaluateComponent(kind, {
        inboundRps: 100,
        capacity: resolveCapacity(kind, undefined),
      });
      expect(result.limitations.length).toBeGreaterThan(0);
    }
  });
});
