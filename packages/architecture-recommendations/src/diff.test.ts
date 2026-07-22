import { describe, expect, it } from "vitest";

import { previewPatch } from "./apply-patch";
import { computeDocumentDiff } from "./diff";
import { generateRecommendations } from "./generate-recommendations";
import { buildDocument, buildFindings, buildSampleLikeDocument } from "./test-support/fixtures";

const NEXT = "2026-02-01T00:00:00.000Z";

describe("computeDocumentDiff", () => {
  it("reports nothing changed when comparing a document with itself", () => {
    const document = buildSampleLikeDocument();
    const diff = computeDocumentDiff(document, document);
    expect(diff.addedCount).toBe(0);
    expect(diff.removedCount).toBe(0);
    expect(diff.modifiedCount).toBe(0);
    expect(diff.nodes.every((node) => node.state === "unchanged")).toBe(true);
  });

  it("marks the dead-letter patch as one added node and one added connection", () => {
    const document = buildSampleLikeDocument();
    const recommendation = generateRecommendations({
      document,
      findings: buildFindings(document),
    }).find((item) => item.builderId === "add-dead-letter-path");
    const preview = previewPatch(
      document,
      (recommendation?.operations ?? []).map((item) => item.operation),
      NEXT,
    );
    if (!preview.ok) throw new Error("expected success");

    const diff = computeDocumentDiff(document, preview.document);
    expect(diff.addedCount).toBe(2);
    expect(diff.removedCount).toBe(0);
    expect(diff.nodeStates.get("rabbitmq-dead-letter")).toBe("added");
    expect(diff.nodeStates.get("rabbitmq")).toBe("unchanged");
  });

  it("detects a modified node and names the changed fields", () => {
    const before = buildDocument([{ id: "app" }]);
    const after = previewPatch(
      before,
      [{ type: "update-node", nodeId: "app", changes: { planned: true } }],
      NEXT,
    );
    if (!after.ok) throw new Error("expected success");

    const diff = computeDocumentDiff(before, after.document);
    expect(diff.modifiedCount).toBe(1);
    expect(diff.nodes[0]?.changedFields).toEqual(["planned"]);
  });

  it("ignores canvas position changes — layout is not architecture", () => {
    const before = buildDocument([{ id: "app" }]);
    const moved = {
      ...before,
      nodes: before.nodes.map((node) => ({ ...node, position: { x: 999, y: 999 } })),
    };
    expect(computeDocumentDiff(before, moved).modifiedCount).toBe(0);
  });

  it("detects removals", () => {
    const before = buildDocument([{ id: "a" }, { id: "b" }], [["a", "b"]]);
    const after = previewPatch(before, [{ type: "remove-node", nodeId: "b" }], NEXT);
    if (!after.ok) throw new Error("expected success");
    const diff = computeDocumentDiff(before, after.document);
    // One node and its connection.
    expect(diff.removedCount).toBe(2);
    expect(diff.nodeStates.get("b")).toBe("removed");
  });

  it("orders entries by id for stable rendering", () => {
    const document = buildSampleLikeDocument();
    const diff = computeDocumentDiff(document, document);
    const ids = diff.nodes.map((node) => node.nodeId);
    expect(ids).toEqual([...ids].sort());
  });
});
