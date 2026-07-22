import { AUDIT_STATE_SCHEMA_VERSION, type ProjectAuditState } from "@axon/architecture-audit";
import { beforeEach, describe, expect, it } from "vitest";

import { LocalStorageAuditRepository } from "./audit-repository";

const STATE: ProjectAuditState = {
  schemaVersion: AUDIT_STATE_SCHEMA_VERSION,
  projectId: "project-1",
  documentId: "doc-1",
  rulesetVersion: "1.0.0",
  lastRunAt: "2026-01-01T00:00:00.000Z",
  documentUpdatedAtAtRun: "2026-01-01T00:00:00.000Z",
  findings: [],
};

describe("LocalStorageAuditRepository", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips an audit state per project", async () => {
    const repository = new LocalStorageAuditRepository();
    expect(await repository.getAuditState("project-1")).toBeNull();
    await repository.saveAuditState(STATE);
    expect(await repository.getAuditState("project-1")).toEqual(STATE);
    expect(await repository.getAuditState("project-2")).toBeNull();
  });

  it("treats corrupt entries as never-run instead of trusting them", async () => {
    window.localStorage.setItem("axon.audit.v1.project-1", "{not json");
    const repository = new LocalStorageAuditRepository();
    expect(await repository.getAuditState("project-1")).toBeNull();

    window.localStorage.setItem(
      "axon.audit.v1.project-1",
      JSON.stringify({ ...STATE, schemaVersion: "0.1" }),
    );
    expect(await repository.getAuditState("project-1")).toBeNull();
  });

  it("refuses to persist invalid states", async () => {
    const repository = new LocalStorageAuditRepository();
    await expect(repository.saveAuditState({ ...STATE, lastRunAt: "not-a-date" })).rejects.toThrow(
      /invalid audit state/,
    );
  });

  it("deletes audit state", async () => {
    const repository = new LocalStorageAuditRepository();
    await repository.saveAuditState(STATE);
    await repository.deleteAuditState("project-1");
    expect(await repository.getAuditState("project-1")).toBeNull();
  });
});
