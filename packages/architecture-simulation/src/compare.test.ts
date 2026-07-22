import { describe, expect, it } from "vitest";

import { compareSimulations } from "./compare";
import { BASELINE_SCENARIO, type Scenario } from "./scenario";
import { runSimulation } from "./run-simulation";
import { buildDocument, buildSampleLikeDocument } from "./test-support/fixtures";

describe("compareSimulations", () => {
  const document = buildSampleLikeDocument();
  const baseline = runSimulation({ document, scenario: BASELINE_SCENARIO });

  it("reports higher utilization under a heavier scenario", () => {
    const burst: Scenario = { ...BASELINE_SCENARIO, id: "burst", requestsPerSecond: 12_000 };
    const comparison = compareSimulations(baseline, runSimulation({ document, scenario: burst }));

    expect(comparison.baselineScenarioId).toBe("baseline");
    expect(comparison.scenarioId).toBe("burst");
    const postgres = comparison.components.find((item) => item.nodeId === "postgres");
    expect(postgres?.direction).toBe("increase");
    expect(postgres?.utilizationDelta ?? 0).toBeGreaterThan(0);
  });

  it("reports unchanged when the same run is compared with itself", () => {
    const comparison = compareSimulations(baseline, baseline);
    expect(comparison.components.every((item) => item.direction === "unchanged")).toBe(true);
    expect(comparison.modelVersionMismatch).toBe(false);
  });

  it("marks components missing from one run as not-comparable", () => {
    const smaller = runSimulation({ document: buildDocument([{ id: "cdn" }]) });
    const comparison = compareSimulations(baseline, smaller);
    const gateway = comparison.components.find((item) => item.nodeId === "gateway");
    expect(gateway?.direction).toBe("not-comparable");
    expect(gateway?.utilizationDelta).toBeNull();
  });

  it("flags a model-version mismatch instead of comparing silently", () => {
    const comparison = compareSimulations({ ...baseline, modelVersion: "0.9.0" }, baseline);
    expect(comparison.modelVersionMismatch).toBe(true);
  });

  it("orders components by node id", () => {
    const comparison = compareSimulations(baseline, baseline);
    const ids = comparison.components.map((item) => item.nodeId);
    expect(ids).toEqual([...ids].sort());
  });
});
