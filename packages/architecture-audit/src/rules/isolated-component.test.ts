import { describe, expect, it } from "vitest";

import { isolatedComponentRule } from "./isolated-component";
import { buildDocument, buildSampleLikeDocument } from "../test-support/fixtures";

import { buildGraphIndex, type ArchitectureDocument } from "@axon/diagram-schema";

function run(document: ArchitectureDocument) {
  return isolatedComponentRule.evaluate({ document, index: buildGraphIndex(document) });
}

describe("isolatedComponentRule", () => {
  it("flags a node with no connections", () => {
    const document = buildDocument([{ id: "a" }, { id: "b" }, { id: "orphan" }], [["a", "b"]]);
    const drafts = run(document);
    expect(drafts.map((draft) => draft.fingerprintKey)).toEqual(["orphan"]);
    expect(drafts[0]?.severity).toBe("low");
  });

  it("does not fire on the sample topology (everything is connected)", () => {
    expect(run(buildSampleLikeDocument())).toEqual([]);
  });

  it("returns nothing for an empty document", () => {
    expect(run(buildDocument([]))).toEqual([]);
  });
});
