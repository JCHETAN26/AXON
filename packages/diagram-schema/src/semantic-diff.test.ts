import { describe, it, expect } from "vitest";
import { computeSemanticDocumentDiff } from "./semantic-diff";
import { computeSemanticHash } from "./semantic-hash";
import { createEmptyArchitectureDocument } from "./architecture-document";

describe("semantic-diff and semantic-hash", () => {
  it("computes identical semantic hash for same architecture content regardless of node order", () => {
    const doc1 = createEmptyArchitectureDocument({ id: "doc-1", name: "Test Doc", projectId: "p1", now: "2026-01-01T00:00:00Z" });
    doc1.nodes = [
      { id: "n1", name: "API", category: "compute", position: { x: 10, y: 10 } },
      { id: "n2", name: "DB", category: "database", position: { x: 20, y: 20 } },
    ];

    const doc2 = createEmptyArchitectureDocument({ id: "doc-2", name: "Test Doc 2", projectId: "p1", now: "2026-01-01T00:00:00Z" });
    doc2.nodes = [
      { id: "n2", name: "DB", category: "database", position: { x: 500, y: 500 } },
      { id: "n1", name: "API", category: "compute", position: { x: 0, y: 0 } },
    ];

    expect(computeSemanticHash(doc1)).toBe(computeSemanticHash(doc2));
  });

  it("computes semantic diff correctly when components are added, removed, or modified", () => {
    const base = createEmptyArchitectureDocument({ id: "doc-1", name: "Base", projectId: "p1", now: "2026-01-01T00:00:00Z" });
    base.nodes = [
      { id: "n1", name: "API", category: "compute" },
      { id: "n2", name: "Cache", category: "cache" },
    ];

    const target = createEmptyArchitectureDocument({ id: "doc-2", name: "Target", projectId: "p1", now: "2026-01-01T00:00:00Z" });
    target.nodes = [
      { id: "n1", name: "API Gateway", category: "compute" },
      { id: "n3", name: "DB", category: "database" },
    ];

    const diff = computeSemanticDocumentDiff(base, target);

    expect(diff.summary.hasChanges).toBe(true);
    expect(diff.summary.addedComponents).toBe(1);
    expect(diff.summary.removedComponents).toBe(1);
    expect(diff.summary.modifiedComponents).toBe(1);

    const added = diff.components.find((c) => c.changeType === "added");
    expect(added?.name).toBe("DB");

    const removed = diff.components.find((c) => c.changeType === "removed");
    expect(removed?.name).toBe("Cache");

    const modified = diff.components.find((c) => c.changeType === "modified");
    expect(modified?.name).toBe("API Gateway");
  });
});
