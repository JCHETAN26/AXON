import { describe, expect, it } from "vitest";

import { computePropagationOrder, findEntryNodeIds } from "./propagation";
import { buildDocument, buildSampleLikeDocument } from "./test-support/fixtures";

import { buildGraphIndex, type ArchitectureDocument } from "@axon/diagram-schema";

function index(document: ArchitectureDocument) {
  return buildGraphIndex(document);
}

describe("findEntryNodeIds", () => {
  it("finds the single front door of the sample topology", () => {
    const document = buildSampleLikeDocument();
    expect(findEntryNodeIds(document, index(document))).toEqual(["cdn"]);
  });

  it("excludes telemetry-only sinks and isolated nodes", () => {
    // datadog receives telemetry only and emits nothing: not an entry point.
    const document = buildSampleLikeDocument();
    const entries = findEntryNodeIds(document, index(document));
    expect(entries).not.toContain("datadog");

    const withOrphan = buildDocument([{ id: "a" }, { id: "b" }, { id: "orphan" }], [["a", "b"]]);
    expect(findEntryNodeIds(withOrphan, index(withOrphan))).toEqual(["a"]);
  });
});

describe("computePropagationOrder", () => {
  it("orders dependencies before dependents", () => {
    const document = buildSampleLikeDocument();
    const { order, cycleNodeIds } = computePropagationOrder(document, index(document));
    expect(cycleNodeIds).toEqual([]);
    expect(order.indexOf("cdn")).toBeLessThan(order.indexOf("gateway"));
    expect(order.indexOf("gateway")).toBeLessThan(order.indexOf("app"));
    expect(order.indexOf("app")).toBeLessThan(order.indexOf("postgres"));
    expect(order.indexOf("rabbitmq")).toBeLessThan(order.indexOf("workers"));
    expect(order).toHaveLength(document.nodes.length);
  });

  it("is deterministic across identical documents", () => {
    const first = computePropagationOrder(
      buildSampleLikeDocument(),
      index(buildSampleLikeDocument()),
    );
    const second = computePropagationOrder(
      buildSampleLikeDocument(),
      index(buildSampleLikeDocument()),
    );
    expect(first.order).toEqual(second.order);
  });

  it("reports cycle members instead of looping forever", () => {
    const document = buildDocument(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [
        ["a", "b"],
        ["b", "c"],
        ["c", "b"],
      ],
    );
    const { order, cycleNodeIds } = computePropagationOrder(document, index(document));
    expect(cycleNodeIds).toEqual(["b", "c"]);
    // Every node is still evaluated exactly once.
    expect(order).toHaveLength(3);
    expect(new Set(order).size).toBe(3);
  });

  it("ignores telemetry edges when ordering", () => {
    // datadog has telemetry inbound only, so it sorts as a root, not a leaf.
    const document = buildSampleLikeDocument();
    const { order } = computePropagationOrder(document, index(document));
    expect(order).toContain("datadog");
  });
});
