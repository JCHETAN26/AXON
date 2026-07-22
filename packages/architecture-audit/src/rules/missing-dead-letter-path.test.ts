import { describe, expect, it } from "vitest";

import { missingDeadLetterPathRule } from "./missing-dead-letter-path";
import { buildDocument, buildSampleLikeDocument } from "../test-support/fixtures";

import { buildGraphIndex, type ArchitectureDocument } from "@axon/diagram-schema";

function run(document: ArchitectureDocument) {
  return missingDeadLetterPathRule.evaluate({ document, index: buildGraphIndex(document) });
}

describe("missingDeadLetterPathRule", () => {
  it("flags only rabbitmq on the sample topology", () => {
    const drafts = run(buildSampleLikeDocument());
    expect(drafts.map((draft) => draft.fingerprintKey)).toEqual(["rabbitmq"]);
    expect(drafts[0]?.title).toBe('No dead-letter path is represented for "rabbitmq"');
  });

  it("does not flag a broker with a second outgoing async path", () => {
    const document = buildDocument(
      [{ id: "producer" }, { id: "broker" }, { id: "consumer" }, { id: "dlq" }],
      [
        ["producer", "broker", "async"],
        ["broker", "consumer", "async"],
        ["broker", "dlq", "async"],
      ],
    );
    expect(run(document)).toEqual([]);
  });

  it("does not flag a node without incoming async traffic", () => {
    const document = buildDocument(
      [{ id: "app" }, { id: "broker" }, { id: "consumer" }],
      [
        ["app", "broker", "sync"],
        ["broker", "consumer", "async"],
      ],
    );
    expect(run(document)).toEqual([]);
  });

  it("does not flag a terminal async consumer", () => {
    const document = buildDocument(
      [{ id: "producer" }, { id: "consumer" }],
      [["producer", "consumer", "async"]],
    );
    expect(run(document)).toEqual([]);
  });
});
