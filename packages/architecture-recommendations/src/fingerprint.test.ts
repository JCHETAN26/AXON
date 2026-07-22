import { describe, expect, it } from "vitest";

import {
  canonicalStringify,
  computeOperationFingerprint,
  computeRecommendationFingerprint,
} from "./fingerprint";
import { type PatchOperation } from "./patch";

describe("canonicalStringify", () => {
  it("is insensitive to key order", () => {
    expect(canonicalStringify({ b: 1, a: 2 })).toBe(canonicalStringify({ a: 2, b: 1 }));
  });

  it("keeps array order significant", () => {
    expect(canonicalStringify([1, 2])).not.toBe(canonicalStringify([2, 1]));
  });

  it("drops undefined members so optional fields do not shift identity", () => {
    expect(canonicalStringify({ a: 1, b: undefined })).toBe(canonicalStringify({ a: 1 }));
  });
});

describe("computeRecommendationFingerprint", () => {
  it("is stable for the same builder and finding", () => {
    expect(computeRecommendationFingerprint("b", "f")).toBe(
      computeRecommendationFingerprint("b", "f"),
    );
  });

  it("differs across builders and findings", () => {
    expect(computeRecommendationFingerprint("b1", "f")).not.toBe(
      computeRecommendationFingerprint("b2", "f"),
    );
    expect(computeRecommendationFingerprint("b", "f1")).not.toBe(
      computeRecommendationFingerprint("b", "f2"),
    );
  });
});

describe("computeOperationFingerprint", () => {
  const operation: PatchOperation = {
    type: "add-edge",
    edge: { id: "e", source: "a", target: "b", kind: "async" },
  };

  it("depends on content, not key order", () => {
    const reordered: PatchOperation = {
      edge: { kind: "async", target: "b", source: "a", id: "e" },
      type: "add-edge",
    } as PatchOperation;
    expect(computeOperationFingerprint("r", operation)).toBe(
      computeOperationFingerprint("r", reordered),
    );
  });

  it("is scoped to its recommendation", () => {
    expect(computeOperationFingerprint("r1", operation)).not.toBe(
      computeOperationFingerprint("r2", operation),
    );
  });

  it("changes when the operation changes", () => {
    expect(computeOperationFingerprint("r", operation)).not.toBe(
      computeOperationFingerprint("r", {
        type: "add-edge",
        edge: { id: "e", source: "a", target: "b", kind: "sync" },
      }),
    );
  });
});
