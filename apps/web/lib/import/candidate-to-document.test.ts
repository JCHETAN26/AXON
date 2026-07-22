import { importCompose } from "@axon/architecture-compose-import";
import { parseArchitectureDocument } from "@axon/diagram-schema";
import { describe, expect, it } from "vitest";

import { buildImportedDocument } from "./candidate-to-document";
import { SAMPLE_COMPOSE } from "./test-support/compose";

const NOW = "2026-06-01T00:00:00.000Z";

function baseDocument() {
  return parseArchitectureDocument({
    schemaVersion: "1.0",
    id: "doc-1",
    projectId: "project-1",
    name: "Imports",
    description: "A project",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    source: { kind: "manual" },
    assumptions: [],
    nodes: [],
    edges: [],
    groups: [],
    metadata: { generator: "axon-web" },
  });
}

describe("buildImportedDocument", () => {
  it("produces a valid document that preserves project identity", () => {
    const result = importCompose(SAMPLE_COMPOSE);
    const built = buildImportedDocument({
      candidate: result.candidate,
      base: baseDocument(),
      importerVersion: result.importerVersion,
      options: {},
      now: NOW,
    });

    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.document.id).toBe("doc-1");
    expect(built.document.projectId).toBe("project-1");
    expect(built.document.createdAt).toBe("2026-05-01T00:00:00.000Z");
    expect(built.document.updatedAt).toBe(NOW);
    expect(built.document.source.kind).toBe("imported");
    expect(built.document.nodes.length).toBe(result.candidate.nodes.length);
    // No coordinates come from the importer — AXON's layout owns positions.
    expect(built.document.nodes.every((node) => node.position === undefined)).toBe(true);
  });

  it("records the importer version in generation metadata", () => {
    const result = importCompose(SAMPLE_COMPOSE);
    const built = buildImportedDocument({
      candidate: result.candidate,
      base: baseDocument(),
      importerVersion: result.importerVersion,
      options: {},
      now: NOW,
    });
    if (!built.ok) throw new Error("expected success");
    expect(built.document.metadata.notes).toContain("importer v1.0.0");
  });

  it("carries a reviewer category override into the document", () => {
    const result = importCompose(SAMPLE_COMPOSE, { categoryOverrides: { api: "Compute" } });
    const built = buildImportedDocument({
      candidate: result.candidate,
      base: baseDocument(),
      importerVersion: result.importerVersion,
      options: { categoryOverrides: { api: "Compute" } },
      now: NOW,
    });
    if (!built.ok) throw new Error("expected success");
    expect(built.document.nodes.find((node) => node.id === "api")?.category).toBe("Compute");
  });
});
