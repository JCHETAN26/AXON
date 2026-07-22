import { describe, expect, it } from "vitest";

import {
  ARCHITECTURE_SCHEMA_VERSION,
  createEmptyArchitectureDocument,
  parseArchitectureDocument,
  safeParseArchitectureDocument,
} from "./architecture-document";
import { parseProject } from "./project";

const NOW = "2026-07-19T12:00:00.000Z";

function validDocument() {
  return {
    schemaVersion: ARCHITECTURE_SCHEMA_VERSION,
    id: "doc-1",
    projectId: "project-1",
    name: "Test architecture",
    createdAt: NOW,
    updatedAt: NOW,
    source: { kind: "manual" },
    assumptions: [{ id: "mau", label: "Monthly active users", value: "250,000" }],
    nodes: [
      { id: "api", name: "api-gateway", category: "Gateway", groupId: "edge" },
      { id: "db", name: "postgresql", category: "Database", groupId: "data" },
    ],
    edges: [{ id: "api-db", source: "api", target: "db", kind: "data" }],
    groups: [
      { id: "edge", label: "Public Edge" },
      { id: "data", label: "Data Layer" },
    ],
    metadata: { generator: "axon-web" },
  };
}

describe("ArchitectureDocument schema", () => {
  it("accepts a valid document", () => {
    expect(() => parseArchitectureDocument(validDocument())).not.toThrow();
  });

  it("rejects unknown schema versions", () => {
    const result = safeParseArchitectureDocument({ ...validDocument(), schemaVersion: "2.0" });
    expect(result.success).toBe(false);
  });

  it("rejects edges that reference missing nodes", () => {
    const document = validDocument();
    document.edges.push({ id: "bad", source: "api", target: "ghost", kind: "sync" });
    const result = safeParseArchitectureDocument(document);
    expect(result.success).toBe(false);
  });

  it("rejects self-loops and duplicate ids", () => {
    const withSelfLoop = validDocument();
    withSelfLoop.edges.push({ id: "loop", source: "api", target: "api", kind: "sync" });
    expect(safeParseArchitectureDocument(withSelfLoop).success).toBe(false);

    const withDuplicateNode = validDocument();
    withDuplicateNode.nodes.push({
      id: "api",
      name: "duplicate",
      category: "Gateway",
      groupId: "edge",
    });
    expect(safeParseArchitectureDocument(withDuplicateNode).success).toBe(false);
  });

  it("rejects nodes that reference unknown groups", () => {
    const document = validDocument();
    document.nodes.push({ id: "cache", name: "redis", category: "Cache", groupId: "ghost" });
    expect(safeParseArchitectureDocument(document).success).toBe(false);
  });

  it("rejects non-ISO timestamps and empty names", () => {
    expect(
      safeParseArchitectureDocument({ ...validDocument(), createdAt: "yesterday" }).success,
    ).toBe(false);
    expect(safeParseArchitectureDocument({ ...validDocument(), name: "" }).success).toBe(false);
  });

  it("creates a valid empty document", () => {
    const document = createEmptyArchitectureDocument({
      id: "doc-2",
      projectId: "project-2",
      name: "Blank",
      now: NOW,
    });
    expect(document.nodes).toHaveLength(0);
    expect(document.source.kind).toBe("manual");
    expect(() => parseArchitectureDocument(document)).not.toThrow();
  });
});

describe("Project schema", () => {
  it("round-trips a valid project", () => {
    const project = parseProject({
      schemaVersion: "1.0",
      id: "project-1",
      name: "My system",
      createdAt: NOW,
      updatedAt: NOW,
      architectureDocumentId: "doc-1",
    });
    expect(project.name).toBe("My system");
  });

  it("rejects a project without a document reference", () => {
    expect(() =>
      parseProject({
        schemaVersion: "1.0",
        id: "project-1",
        name: "My system",
        createdAt: NOW,
        updatedAt: NOW,
      }),
    ).toThrow();
  });
});
