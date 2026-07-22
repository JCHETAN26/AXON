import { describe, expect, it } from "vitest";

import { CapacityProfileSchema, resolveCapacity } from "./capacity-profile";

describe("resolveCapacity", () => {
  it("falls back to AXON defaults and attributes them as such", () => {
    const capacity = resolveCapacity("database", undefined);
    expect(capacity.maxConnections).toBe(300);
    expect(capacity.fieldBasis["maxConnections"]).toBe("axon-default");
  });

  it("records exactly which fields the user supplied", () => {
    const capacity = resolveCapacity("database", { maxConnections: 500 });
    expect(capacity.maxConnections).toBe(500);
    // Untouched fields keep their defaults and are not claimed as user input.
    expect(capacity.connectionsPerRequest).toBeCloseTo(82 / 1200);
    expect(capacity.fieldBasis["maxConnections"]).toBe("user-input");
    expect(capacity.fieldBasis["connectionsPerRequest"]).toBe("axon-default");
  });

  it("attributes a value read from the architecture to the architecture", () => {
    const capacity = resolveCapacity("database", undefined, { maxConnections: 300 });
    expect(capacity.maxConnections).toBe(300);
    expect(capacity.fieldBasis["maxConnections"]).toBe("architecture-input");
  });

  it("lets a user override win over the architecture", () => {
    const capacity = resolveCapacity("database", { maxConnections: 900 }, { maxConnections: 300 });
    expect(capacity.maxConnections).toBe(900);
    expect(capacity.fieldBasis["maxConnections"]).toBe("user-input");
  });

  it("gives unmodeled components no capacity at all", () => {
    const capacity = resolveCapacity("unmodeled", undefined);
    expect(capacity.units).toBe(0);
    expect(capacity.requestsPerSecondPerUnit).toBe(0);
  });
});

describe("CapacityProfileSchema", () => {
  it("accepts an empty profile and per-node overrides", () => {
    expect(CapacityProfileSchema.safeParse({ components: {} }).success).toBe(true);
    expect(
      CapacityProfileSchema.safeParse({ components: { postgres: { maxConnections: 400 } } })
        .success,
    ).toBe(true);
  });

  it("rejects non-positive capacity and out-of-range percentages", () => {
    expect(CapacityProfileSchema.safeParse({ components: { a: { units: 0 } } }).success).toBe(
      false,
    );
    expect(
      CapacityProfileSchema.safeParse({ components: { a: { cacheHitPercent: 140 } } }).success,
    ).toBe(false);
  });
});
