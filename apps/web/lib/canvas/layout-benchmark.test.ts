import { describe, expect, it } from "vitest";

import { computeArchitectureAwareLayout } from "./adapters";
import {
  benchmarkArchitectureLayout,
  buildLayoutBenchmarkReport,
  buildSyntheticArchitectureDocument,
  evaluateArchitectureLayout,
} from "./layout-benchmark";

describe("buildSyntheticArchitectureDocument", () => {
  it.each([10, 50, 100, 500])("builds a valid %i-node layout benchmark fixture", (nodeCount) => {
    const document = buildSyntheticArchitectureDocument({ nodeCount });
    const layout = computeArchitectureAwareLayout(document, { preserveExistingPositions: false });
    const quality = evaluateArchitectureLayout(document, layout);

    expect(document.nodes).toHaveLength(nodeCount);
    expect(document.edges).toHaveLength(Math.max(0, nodeCount - 1));
    expect(quality.positionedNodeCount).toBe(nodeCount);
    expect(quality.missingNodeIds).toEqual([]);
    expect(quality.overlappingPairs).toEqual([]);
    expect(quality.backwardEdgeCount).toBe(0);
    expect(quality.leftToRightEdgeCount).toBe(document.edges.length);
    expect(quality.boundingBox.width).toBeGreaterThan(0);
    expect(quality.boundingBox.height).toBeGreaterThan(0);
  });
});

describe("evaluateArchitectureLayout", () => {
  it("reports missing nodes, overlaps, and backward edges", () => {
    const document = buildSyntheticArchitectureDocument({ nodeCount: 3 });
    const quality = evaluateArchitectureLayout(
      document,
      new Map([
        ["service-1", { x: 200, y: 0 }],
        ["service-2", { x: 0, y: 0 }],
      ]),
    );

    expect(quality.positionedNodeCount).toBe(2);
    expect(quality.missingNodeIds).toEqual(["service-3"]);
    expect(quality.overlappingPairs).toEqual([{ first: "service-1", second: "service-2" }]);
    expect(quality.backwardEdgeCount).toBe(1);
  });
});

describe("benchmarkArchitectureLayout", () => {
  it("times deterministic auto-layout and returns quality evidence", () => {
    const document = buildSyntheticArchitectureDocument({ nodeCount: 100 });
    const benchmark = benchmarkArchitectureLayout(document, 3);

    expect(benchmark.iterations).toBe(3);
    expect(benchmark.totalMilliseconds).toBeGreaterThanOrEqual(0);
    expect(benchmark.millisecondsPerRun).toBeGreaterThanOrEqual(0);
    expect(benchmark.quality.nodeCount).toBe(100);
    expect(benchmark.quality.overlappingPairs).toEqual([]);
  });
});

describe("buildLayoutBenchmarkReport", () => {
  it("builds aggregate pass/fail evidence for release validation", () => {
    const report = buildLayoutBenchmarkReport({
      nodeCounts: [10, 50],
      iterations: 1,
      generatedAt: "2026-07-23T00:00:00.000Z",
    });

    expect(report.reportVersion).toBe("axon.layout-benchmark-report.v1");
    expect(report.generatedAt).toBe("2026-07-23T00:00:00.000Z");
    expect(report.status).toBe("passing");
    expect(report.gates).toHaveLength(2);
    expect(report.gates.every((gate) => gate.reasons.length === 0)).toBe(true);
  });
});
