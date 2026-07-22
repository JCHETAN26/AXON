import { describe, expect, it } from "vitest";

import { telemetryCoverageRule } from "./telemetry-coverage";
import { buildDocument, buildSampleLikeDocument } from "../test-support/fixtures";

import { buildGraphIndex, type ArchitectureDocument } from "@axon/diagram-schema";

function run(document: ArchitectureDocument) {
  return telemetryCoverageRule.evaluate({ document, index: buildGraphIndex(document) });
}

describe("telemetryCoverageRule", () => {
  it("emits a single document-scoped finding on the sample topology", () => {
    const drafts = run(buildSampleLikeDocument());
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.fingerprintKey).toBe("document");
    // Covered: app and postgres (telemetry sources), datadog (sink).
    expect(drafts[0]?.elementIds).toHaveLength(9);
    expect(drafts[0]?.elementIds).not.toContain("app");
    expect(drafts[0]?.elementIds).not.toContain("postgres");
    expect(drafts[0]?.elementIds).not.toContain("datadog");
  });

  it("keeps the same fingerprint key when the uncovered set changes", () => {
    const before = run(buildSampleLikeDocument());
    const smaller = buildDocument(
      [{ id: "a" }, { id: "b" }, { id: "sink" }],
      [["a", "sink", "telemetry"]],
    );
    const after = run(smaller);
    expect(before[0]?.fingerprintKey).toBe(after[0]?.fingerprintKey);
  });

  it("stays silent when every component has a telemetry path", () => {
    const document = buildDocument(
      [{ id: "a" }, { id: "b" }, { id: "sink" }],
      [
        ["a", "sink", "telemetry"],
        ["b", "sink", "telemetry"],
      ],
    );
    expect(run(document)).toEqual([]);
  });

  it("excludes planned components from the gap", () => {
    const document = buildDocument(
      [{ id: "a" }, { id: "future", planned: true }, { id: "sink" }],
      [["a", "sink", "telemetry"]],
    );
    expect(run(document)).toEqual([]);
  });

  it("returns nothing for an empty document", () => {
    expect(run(buildDocument([]))).toEqual([]);
  });

  it("reports a full gap when no telemetry is represented at all", () => {
    const document = buildDocument([{ id: "a" }, { id: "b" }], [["a", "b"]]);
    const drafts = run(document);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.evidence[0]?.text).toBe(
      "No telemetry connections are represented in the document.",
    );
  });
});
