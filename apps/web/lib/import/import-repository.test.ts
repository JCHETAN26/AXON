import { beforeEach, describe, expect, it } from "vitest";

import { LocalStorageImportRepository, type ImportDraft } from "./import-repository";

const DRAFT: ImportDraft = {
  schemaVersion: "1.0",
  projectId: "project-1",
  composeText: "services:\n  api:\n    image: node",
  categoryOverrides: { api: "Compute" },
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("LocalStorageImportRepository", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips a draft per project", async () => {
    const repository = new LocalStorageImportRepository();
    expect(await repository.getDraft("project-1")).toBeNull();
    await repository.saveDraft(DRAFT);
    expect(await repository.getDraft("project-1")).toEqual(DRAFT);
    expect(await repository.getDraft("project-2")).toBeNull();
  });

  it("treats corrupt or outdated entries as absent", async () => {
    const repository = new LocalStorageImportRepository();
    window.localStorage.setItem("axon.import.v1.project-1", "{broken");
    expect(await repository.getDraft("project-1")).toBeNull();
    window.localStorage.setItem(
      "axon.import.v1.project-1",
      JSON.stringify({ ...DRAFT, schemaVersion: "0.1" }),
    );
    expect(await repository.getDraft("project-1")).toBeNull();
  });

  it("deletes a draft", async () => {
    const repository = new LocalStorageImportRepository();
    await repository.saveDraft(DRAFT);
    await repository.deleteDraft("project-1");
    expect(await repository.getDraft("project-1")).toBeNull();
  });
});
