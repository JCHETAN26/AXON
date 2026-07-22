import { beforeEach, describe, expect, it } from "vitest";

import { LocalStorageProjectRepository } from "./local-storage-repository";
import { createSampleArchitectureDocument } from "./sample-project";
import { DEMO_EDGES, DEMO_NODES } from "@/data/demo-architecture";

describe("LocalStorageProjectRepository", () => {
  let repository: LocalStorageProjectRepository;

  beforeEach(() => {
    window.localStorage.clear();
    repository = new LocalStorageProjectRepository(window.localStorage);
  });

  it("starts empty", async () => {
    await expect(repository.listProjects()).resolves.toEqual([]);
  });

  it("creates, lists, fetches and deletes a blank project", async () => {
    const created = await repository.createProject({ name: "My system", template: "blank" });
    expect(created.project.name).toBe("My system");
    expect(created.document.nodes).toHaveLength(0);
    expect(created.document.projectId).toBe(created.project.id);

    const listed = await repository.listProjects();
    expect(listed).toHaveLength(1);

    const fetched = await repository.getProject(created.project.id);
    expect(fetched?.document.id).toBe(created.project.architectureDocumentId);

    await repository.deleteProject(created.project.id);
    await expect(repository.listProjects()).resolves.toEqual([]);
    await expect(repository.getProject(created.project.id)).resolves.toBeNull();
  });

  it("creates a sample project from the explicit factory with the full architecture", async () => {
    const created = await repository.createProject({
      name: "Sample walkthrough",
      template: "sample",
    });
    expect(created.document.source.kind).toBe("sample");
    expect(created.document.nodes).toHaveLength(DEMO_NODES.length);
    expect(created.document.edges).toHaveLength(DEMO_EDGES.length);
    expect(created.document.assumptions.length).toBeGreaterThan(0);
  });

  it("survives corrupt storage entries instead of crashing", async () => {
    window.localStorage.setItem("axon.projects.v1", "{not json");
    await expect(repository.listProjects()).resolves.toEqual([]);

    window.localStorage.setItem(
      "axon.projects.v1",
      JSON.stringify([{ schemaVersion: "1.0", id: "broken" }, null, 42]),
    );
    await expect(repository.listProjects()).resolves.toEqual([]);
  });

  it("returns null when a project's document is missing or invalid", async () => {
    const created = await repository.createProject({ name: "Orphan", template: "blank" });
    window.localStorage.setItem(
      `axon.document.v1.${created.project.architectureDocumentId}`,
      JSON.stringify({ schemaVersion: "1.0", id: "bad" }),
    );
    await expect(repository.getProject(created.project.id)).resolves.toBeNull();
  });

  it("updates a project's document while preserving identity", async () => {
    const created = await repository.createProject({ name: "Evolving", template: "blank" });
    const updatedAt = new Date().toISOString();
    const nextDocument = {
      ...created.document,
      name: "Evolved",
      updatedAt,
      nodes: [{ id: "svc", name: "service", category: "Compute" }],
    };
    const saved = await repository.updateDocument(created.project.id, nextDocument);
    expect(saved.document.nodes).toHaveLength(1);
    expect(saved.project.updatedAt).toBe(updatedAt);

    const reread = await repository.getProject(created.project.id);
    expect(reread?.document.name).toBe("Evolved");
  });

  it("rejects documents whose identity does not match the project", async () => {
    const created = await repository.createProject({ name: "Guarded", template: "blank" });
    await expect(
      repository.updateDocument(created.project.id, { ...created.document, id: "other-doc" }),
    ).rejects.toThrow(/identity/);
    await expect(repository.updateDocument("missing-project", created.document)).rejects.toThrow(
      /Unknown project/,
    );
  });

  it("persists across repository instances", async () => {
    const created = await repository.createProject({ name: "Durable", template: "sample" });
    const secondInstance = new LocalStorageProjectRepository(window.localStorage);
    const fetched = await secondInstance.getProject(created.project.id);
    expect(fetched?.project.name).toBe("Durable");
    expect(fetched?.document.nodes).toHaveLength(DEMO_NODES.length);
  });
});

describe("createSampleArchitectureDocument", () => {
  it("produces a schema-valid document decoupled from the demo dataset", () => {
    const document = createSampleArchitectureDocument({
      id: "doc-1",
      projectId: "project-1",
      now: "2026-07-19T12:00:00.000Z",
    });
    expect(document.schemaVersion).toBe("1.0");
    expect(document.nodes.map((node) => node.id)).toContain("postgres");
    // Mutating the produced document must not touch the demo dataset.
    const firstNode = document.nodes[0];
    if (firstNode !== undefined) {
      firstNode.name = "mutated";
    }
    expect(DEMO_NODES[0]?.name).not.toBe("mutated");
  });
});
