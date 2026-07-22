import { describe, expect, it } from "vitest";

import { singlePointOfFailureRule } from "./single-point-of-failure";
import { buildDocument, buildSampleLikeDocument } from "../test-support/fixtures";

import { buildGraphIndex, type ArchitectureDocument } from "@axon/diagram-schema";

function run(document: ArchitectureDocument) {
  return singlePointOfFailureRule.evaluate({ document, index: buildGraphIndex(document) });
}

describe("singlePointOfFailureRule", () => {
  it("flags exactly gateway, app, and rabbitmq on the sample topology", () => {
    const drafts = run(buildSampleLikeDocument());
    expect(drafts.map((draft) => draft.fingerprintKey).sort()).toEqual([
      "app",
      "gateway",
      "rabbitmq",
    ]);
    expect(drafts.every((draft) => draft.severity === "high")).toBe(true);
  });

  it("reports which components are stranded", () => {
    const drafts = run(buildSampleLikeDocument());
    const gateway = drafts.find((draft) => draft.fingerprintKey === "gateway");
    expect(gateway?.detected).toContain('"auth"');
    expect(gateway?.detected).toContain('"cdn"');
    expect(gateway?.detected).toContain("2 components");
  });

  it("does not flag a node that strands only one component", () => {
    // b sits between a and c, but removing it strands only one node each side
    // of the largest remaining component.
    const document = buildDocument(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [
        ["a", "b"],
        ["b", "c"],
      ],
    );
    expect(run(document)).toEqual([]);
  });

  it("flags the hub of a star with at least three leaves", () => {
    const document = buildDocument(
      [{ id: "hub" }, { id: "a" }, { id: "b" }, { id: "c" }],
      [
        ["hub", "a"],
        ["hub", "b"],
        ["hub", "c"],
      ],
    );
    const drafts = run(document);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.fingerprintKey).toBe("hub");
  });

  it("does not flag anything when a redundant path exists", () => {
    // Diamond: two parallel paths from a to d.
    const document = buildDocument(
      [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
      [
        ["a", "b"],
        ["a", "c"],
        ["b", "d"],
        ["c", "d"],
      ],
    );
    expect(run(document)).toEqual([]);
  });

  it("handles disconnected documents independently", () => {
    const document = buildDocument(
      [{ id: "hub" }, { id: "a" }, { id: "b" }, { id: "c" }, { id: "x" }, { id: "y" }],
      [
        ["hub", "a"],
        ["hub", "b"],
        ["hub", "c"],
        ["x", "y"],
      ],
    );
    const drafts = run(document);
    expect(drafts.map((draft) => draft.fingerprintKey)).toEqual(["hub"]);
  });
});
