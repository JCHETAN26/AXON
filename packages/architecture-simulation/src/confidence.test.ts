import { describe, expect, it } from "vitest";

import { resolveCapacity } from "./capacity-profile";
import { deriveConfidence } from "./confidence";
import { runSimulation } from "./run-simulation";
import { buildDocument, buildSampleLikeDocument } from "./test-support/fixtures";

describe("deriveConfidence", () => {
  it("is high when every relevant field is supplied", () => {
    const capacity = resolveCapacity("service", { units: 4, requestsPerSecondPerUnit: 300 });
    expect(deriveConfidence("service", capacity).level).toBe("high");
  });

  it("is low when every relevant field is an AXON default", () => {
    const capacity = resolveCapacity("service", undefined);
    const confidence = deriveConfidence("service", capacity);
    expect(confidence.level).toBe("low");
    expect(confidence.rationale).toContain("AXON default");
  });

  it("is medium when only some relevant fields are supplied", () => {
    const capacity = resolveCapacity("service", { units: 4 });
    expect(deriveConfidence("service", capacity).level).toBe("medium");
  });

  it("counts architecture-provided values as supplied", () => {
    const capacity = resolveCapacity("database", undefined, { maxConnections: 300 });
    // connectionsPerRequest is still a default, so this is a mix.
    expect(deriveConfidence("database", capacity).level).toBe("medium");
  });

  it("ignores fields a kind does not use", () => {
    // A service never reads maxConnections, so supplying it changes nothing.
    const capacity = resolveCapacity("service", {
      units: 4,
      requestsPerSecondPerUnit: 300,
      maxConnections: 999,
    });
    expect(deriveConfidence("service", capacity).level).toBe("high");
  });

  it("is not-applicable for unmodeled components", () => {
    const capacity = resolveCapacity("unmodeled", undefined);
    expect(deriveConfidence("unmodeled", capacity).level).toBe("not-applicable");
  });

  it("is deterministic", () => {
    const capacity = resolveCapacity("cache", { cacheHitPercent: 95 });
    expect(deriveConfidence("cache", capacity)).toEqual(deriveConfidence("cache", capacity));
  });
});

describe("confidence in a run", () => {
  it("grades the sample architecture's documented components higher than bare ones", () => {
    const result = runSimulation({ document: buildSampleLikeDocument() });
    // postgresql documents "conn 82/300" but not its per-request cost → medium.
    const postgres = result.components.find((component) => component.nodeId === "postgres");
    expect(postgres?.confidence).toBe("medium");
    // redis documents its hit rate but not units/throughput → medium.
    const redis = result.components.find((component) => component.nodeId === "redis");
    expect(redis?.confidence).toBe("medium");
  });

  it("marks a component with no documented capacity as low confidence", () => {
    const document = buildDocument(
      [
        { id: "front", category: "Service" },
        { id: "plain", category: "Service" },
      ],
      [["front", "plain", "sync"]],
    );
    const plain = runSimulation({ document }).components.find(
      (component) => component.nodeId === "plain",
    );
    expect(plain?.confidence).toBe("low");
    expect(plain?.confidenceRationale.length).toBeGreaterThan(0);
  });

  it("marks unmodeled components not-applicable", () => {
    const document = buildDocument([{ id: "x", category: "Quantum Mesh" }]);
    const result = runSimulation({ document });
    expect(result.components[0]?.confidence).toBe("not-applicable");
  });
});
