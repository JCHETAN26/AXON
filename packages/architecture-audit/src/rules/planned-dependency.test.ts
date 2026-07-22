import { describe, expect, it } from "vitest";

import { plannedDependencyRule } from "./planned-dependency";
import { buildDocument, buildSampleLikeDocument } from "../test-support/fixtures";

import { buildGraphIndex, type ArchitectureDocument } from "@axon/diagram-schema";

function run(document: ArchitectureDocument) {
  return plannedDependencyRule.evaluate({ document, index: buildGraphIndex(document) });
}

describe("plannedDependencyRule", () => {
  it("flags a running component with a sync dependency on a planned one", () => {
    const document = buildDocument(
      [{ id: "app" }, { id: "search", planned: true }],
      [["app", "search", "sync"]],
    );
    const drafts = run(document);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.fingerprintKey).toBe("app->search");
    expect(drafts[0]?.elementIds).toContain("app");
    expect(drafts[0]?.elementIds).toContain("search");
  });

  it("flags data dependencies as well", () => {
    const document = buildDocument(
      [{ id: "app" }, { id: "warehouse", planned: true }],
      [["app", "warehouse", "data"]],
    );
    expect(run(document)).toHaveLength(1);
  });

  it("ignores async and telemetry edges", () => {
    const document = buildDocument(
      [{ id: "app" }, { id: "queue", planned: true }, { id: "otel", planned: true }],
      [
        ["app", "queue", "async"],
        ["app", "otel", "telemetry"],
      ],
    );
    expect(run(document)).toEqual([]);
  });

  it("ignores planned-to-planned dependencies", () => {
    const document = buildDocument(
      [
        { id: "search", planned: true },
        { id: "index", planned: true },
      ],
      [["search", "index", "sync"]],
    );
    expect(run(document)).toEqual([]);
  });

  it("does not fire on the sample topology (nothing is planned)", () => {
    expect(run(buildSampleLikeDocument())).toEqual([]);
  });
});
