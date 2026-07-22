import { describe, expect, it } from "vitest";

import { BASELINE_SCENARIO, type Scenario } from "./scenario";
import { runSimulation } from "./run-simulation";
import { buildDocument, buildSampleLikeDocument } from "./test-support/fixtures";

import { type ComponentResult } from "./types";

function componentById(components: readonly ComponentResult[], nodeId: string): ComponentResult {
  const result = components.find((component) => component.nodeId === nodeId);
  if (result === undefined) throw new Error(`missing component ${nodeId}`);
  return result;
}

describe("runSimulation", () => {
  it("propagates scenario traffic across the represented paths", () => {
    const { components } = runSimulation({ document: buildSampleLikeDocument() });

    // 1,200 rps enters at the CDN, which is modeled as a cache: at the default
    // 90% hit rate only 10% reaches the origin.
    expect(componentById(components, "cdn").inboundRps).toBe(1200);
    expect(componentById(components, "gateway").inboundRps).toBeCloseTo(120);
    expect(componentById(components, "app").inboundRps).toBeCloseTo(120);

    // The async edge out of the app carries the default 4% job fan-out; the
    // broker then drains everything it holds to its workers.
    expect(componentById(components, "rabbitmq").inboundRps).toBeCloseTo(4.8);
    expect(componentById(components, "workers").inboundRps).toBeCloseTo(4.8);
  });

  it("routes telemetry sinks out of the load path entirely", () => {
    const { components } = runSimulation({ document: buildSampleLikeDocument() });
    const datadog = componentById(components, "datadog");
    expect(datadog.inboundRps).toBe(0);
    expect(datadog.status).toBe("not-modeled");
  });

  it("lets the cache absorb load before the database sees it", () => {
    const document = buildSampleLikeDocument();
    const highHit = runSimulation({
      document,
      capacityProfile: { components: { redis: { cacheHitPercent: 99 } } },
    });
    const lowHit = runSimulation({
      document,
      capacityProfile: { components: { redis: { cacheHitPercent: 50 } } },
    });
    // The cache only forwards misses, so its own outbound rate drops.
    expect(componentById(highHit.components, "redis").outboundRps).toBeLessThan(
      componentById(lowHit.components, "redis").outboundRps,
    );
  });

  it("projects the first constraint deterministically", () => {
    const { firstConstraint } = runSimulation({ document: buildSampleLikeDocument() });
    expect(firstConstraint).not.toBeNull();
    // Utilization is linear, so saturation is scenario rps ÷ utilization.
    const saturation = firstConstraint?.saturationRps ?? 0;
    expect(saturation).toBeGreaterThan(0);
    expect(Number.isFinite(saturation)).toBe(true);
  });

  it("scales the constraint with the scenario, not with the run", () => {
    const document = buildSampleLikeDocument();
    const baseline = runSimulation({ document, scenario: BASELINE_SCENARIO });
    const burst: Scenario = { ...BASELINE_SCENARIO, id: "burst", requestsPerSecond: 12_000 };
    const peak = runSimulation({ document, scenario: burst });

    // The projected saturation point is a property of the architecture, so it
    // must not move when the question changes.
    expect(peak.firstConstraint?.nodeId).toBe(baseline.firstConstraint?.nodeId);
    expect(peak.firstConstraint?.saturationRps).toBeCloseTo(
      baseline.firstConstraint?.saturationRps ?? 0,
      6,
    );
    // Utilization does scale.
    expect(peak.firstConstraint?.utilizationAtScenario ?? 0).toBeGreaterThan(
      baseline.firstConstraint?.utilizationAtScenario ?? 0,
    );
  });

  it("is deterministic: two runs are deeply equal", () => {
    const document = buildSampleLikeDocument();
    expect(runSimulation({ document })).toEqual(runSimulation({ document }));
  });

  it("orders components by node id regardless of document order", () => {
    const document = buildSampleLikeDocument();
    const reversed = { ...document, nodes: [...document.nodes].reverse() };
    const first = runSimulation({ document });
    const second = runSimulation({ document: reversed });
    expect(second.components.map((component) => component.nodeId)).toEqual(
      first.components.map((component) => component.nodeId),
    );
    expect(second.firstConstraint?.nodeId).toBe(first.firstConstraint?.nodeId);
  });

  it("stops load at an offline component", () => {
    const document = buildSampleLikeDocument();
    const scenario: Scenario = { ...BASELINE_SCENARIO, offlineNodeIds: ["gateway"] };
    const { components } = runSimulation({ document, scenario });

    const gateway = componentById(components, "gateway");
    expect(gateway.status).toBe("offline");
    expect(gateway.outboundRps).toBe(0);
    // Everything behind it loses its represented traffic.
    expect(componentById(components, "app").inboundRps).toBe(0);
    expect(componentById(components, "postgres").inboundRps).toBe(0);
    expect(gateway.limitations[0]).toContain("Assumed unavailable");
  });

  it("reports unmodeled components without inventing capacity", () => {
    const document = buildDocument(
      [
        { id: "a", category: "Service" },
        { id: "mystery", category: "Quantum Mesh" },
      ],
      [["a", "mystery"]],
    );
    const result = runSimulation({ document });
    expect(result.unmodeledNodeIds).toEqual(["mystery"]);
    const mystery = componentById(result.components, "mystery");
    expect(mystery.status).toBe("not-modeled");
    expect(mystery.saturationRps).toBeNull();
    expect(mystery.utilization).toBe(0);
  });

  it("reports dependency cycles and still terminates", () => {
    const document = buildDocument(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [
        ["a", "b"],
        ["b", "c"],
        ["c", "b"],
      ],
    );
    const result = runSimulation({ document });
    expect(result.cycleNodeIds).toEqual(["b", "c"]);
    expect(componentById(result.components, "b").limitations[0]).toContain(
      "represented dependency cycle",
    );
  });

  it("returns an empty result for an empty document", () => {
    const result = runSimulation({ document: buildDocument([]) });
    expect(result.components).toEqual([]);
    expect(result.firstConstraint).toBeNull();
  });
});

describe("simulation language honesty guard", () => {
  const FORBIDDEN = [
    /verified/i,
    /guarantee/i,
    /benchmark/i,
    /proven/i,
    /\bexact outage\b/i,
    /real production/i,
  ];

  it("never claims measurement, proof, or a benchmark", () => {
    const documents = [
      buildSampleLikeDocument(),
      buildDocument([{ id: "a" }, { id: "mystery", category: "Quantum Mesh" }], [["a", "mystery"]]),
    ];
    for (const document of documents) {
      for (const component of runSimulation({ document }).components) {
        const texts = [
          ...component.limitations,
          ...component.evidence.map((item) => `${item.label} ${item.value}`),
        ];
        for (const text of texts) {
          for (const pattern of FORBIDDEN) {
            expect(text).not.toMatch(pattern);
          }
        }
      }
    }
  });
});
