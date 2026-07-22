import { describe, expect, it } from "vitest";

import { isOperationSatisfied, previewPatch } from "./apply-patch";
import { generateRecommendations } from "./generate-recommendations";
import { buildDocument, buildFindings, buildSampleLikeDocument } from "./test-support/fixtures";

const NEXT = "2026-02-01T00:00:00.000Z";

function deadLetterOperations() {
  const document = buildSampleLikeDocument();
  const recommendation = generateRecommendations({
    document,
    findings: buildFindings(document),
  }).find((item) => item.builderId === "add-dead-letter-path");
  return {
    document,
    operations: (recommendation?.operations ?? []).map((item) => item.operation),
  };
}

describe("previewPatch", () => {
  it("returns a new document and never mutates the input", () => {
    const { document, operations } = deadLetterOperations();
    const before = structuredClone(document);
    const result = previewPatch(document, operations, NEXT);

    expect(result.ok).toBe(true);
    expect(document).toEqual(before);
    if (result.ok) {
      expect(result.document).not.toBe(document);
      expect(result.document.nodes.length).toBe(document.nodes.length + 1);
    }
  });

  it("preserves document identity, source, assumptions, and metadata", () => {
    const { document, operations } = deadLetterOperations();
    const result = previewPatch(document, operations, NEXT);
    if (!result.ok) throw new Error(result.reasons.join(", "));

    expect(result.document.id).toBe(document.id);
    expect(result.document.projectId).toBe(document.projectId);
    expect(result.document.schemaVersion).toBe(document.schemaVersion);
    expect(result.document.createdAt).toBe(document.createdAt);
    expect(result.document.source).toEqual(document.source);
    expect(result.document.assumptions).toEqual(document.assumptions);
    expect(result.document.metadata).toEqual(document.metadata);
    expect(result.document.description).toBe(document.description);
    // Only updatedAt moves.
    expect(result.document.updatedAt).toBe(NEXT);
  });

  it("assigns a canvas position to a new node near its anchor", () => {
    const { document, operations } = deadLetterOperations();
    const result = previewPatch(document, operations, NEXT);
    if (!result.ok) throw new Error("expected success");
    const added = result.document.nodes.find((node) => node.id === "rabbitmq-dead-letter");
    expect(added?.position).toEqual({ x: 288, y: 152 });
  });

  it("rejects an operation whose target no longer exists", () => {
    const document = buildDocument([{ id: "a" }]);
    const result = previewPatch(document, [{ type: "remove-edge", edgeId: "ghost" }], NEXT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasons[0]).toContain("no longer in the document");
  });

  it("rejects adding a node that already exists", () => {
    const document = buildDocument([{ id: "a", name: "alpha" }]);
    const result = previewPatch(
      document,
      [{ type: "add-node", node: { id: "a", name: "alpha", category: "Service" } }],
      NEXT,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasons[0]).toContain("already exists");
  });

  it("rejects an edge that references a missing component", () => {
    const document = buildDocument([{ id: "a" }]);
    const result = previewPatch(
      document,
      [{ type: "add-edge", edge: { id: "e", source: "a", target: "ghost", kind: "sync" } }],
      NEXT,
    );
    expect(result.ok).toBe(false);
  });

  it("removes connections along with a removed component", () => {
    const document = buildDocument([{ id: "a" }, { id: "b" }], [["a", "b"]]);
    const result = previewPatch(document, [{ type: "remove-node", nodeId: "b" }], NEXT);
    if (!result.ok) throw new Error("expected success");
    expect(result.document.nodes).toHaveLength(1);
    expect(result.document.edges).toHaveLength(0);
  });

  it("applies the same patch twice without duplicating elements", () => {
    const { document, operations } = deadLetterOperations();
    const first = previewPatch(document, operations, NEXT);
    if (!first.ok) throw new Error("expected success");

    // The second attempt is refused rather than duplicating the node.
    const second = previewPatch(first.document, operations, NEXT);
    expect(second.ok).toBe(false);
    expect(first.document.nodes.filter((node) => node.id === "rabbitmq-dead-letter")).toHaveLength(
      1,
    );
  });
});

describe("isOperationSatisfied", () => {
  it("detects an already-present node and edge", () => {
    const { document, operations } = deadLetterOperations();
    expect(operations.every((operation) => isOperationSatisfied(document, operation))).toBe(false);

    const applied = previewPatch(document, operations, NEXT);
    if (!applied.ok) throw new Error("expected success");
    expect(operations.every((operation) => isOperationSatisfied(applied.document, operation))).toBe(
      true,
    );
  });

  it("detects an already-applied node update", () => {
    const document = buildDocument([{ id: "app", planned: true }]);
    expect(
      isOperationSatisfied(document, {
        type: "update-node",
        nodeId: "app",
        changes: { planned: true },
      }),
    ).toBe(true);
  });
});
