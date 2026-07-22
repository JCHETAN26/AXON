import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";
import { beforeEach, describe, expect, it } from "vitest";

import {
  RECOVERY_TTL_MS,
  clearRecoveryRecord,
  loadRecoveryRecord,
  saveRecoveryRecord,
} from "./session-recovery";

const doc = createSampleArchitectureDocument({
  id: "p1",
  projectId: "p1",
  now: "2026-07-21T00:00:00.000Z",
});
const NOW = new Date("2026-07-21T12:00:00.000Z");

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("session-recovery store", () => {
  it("round-trips a minimal recovery record", () => {
    expect(
      saveRecoveryRecord({
        projectId: "p1",
        expectedRevision: 3,
        document: doc,
        safeRoute: "/projects/p1",
        now: NOW,
      }),
    ).toBe(true);

    const loaded = loadRecoveryRecord(NOW);
    expect(loaded).toMatchObject({
      projectId: "p1",
      expectedRevision: 3,
      safeRoute: "/projects/p1",
    });
    expect(loaded?.document.id).toBe("p1");
  });

  it("stores nothing sensitive — only the five permitted fields", () => {
    saveRecoveryRecord({
      projectId: "p1",
      expectedRevision: null,
      document: doc,
      safeRoute: "/projects/p1",
      now: NOW,
    });
    const stored = window.sessionStorage.getItem("axon.session-recovery.v1");
    if (stored === null) throw new Error("expected a stored record");
    const raw = JSON.parse(stored) as Record<string, unknown>;
    expect(Object.keys(raw).sort()).toEqual([
      "document",
      "expectedRevision",
      "projectId",
      "recordedAt",
      "safeRoute",
    ]);
  });

  it("refuses an unsafe route", () => {
    expect(
      saveRecoveryRecord({
        projectId: "p1",
        expectedRevision: 1,
        document: doc,
        safeRoute: "//evil.com",
        now: NOW,
      }),
    ).toBe(false);
    expect(loadRecoveryRecord(NOW)).toBeNull();
  });

  it("ignores and clears an expired record", () => {
    saveRecoveryRecord({
      projectId: "p1",
      expectedRevision: 1,
      document: doc,
      safeRoute: "/projects/p1",
      now: NOW,
    });
    const later = new Date(NOW.getTime() + RECOVERY_TTL_MS + 1);
    expect(loadRecoveryRecord(later)).toBeNull();
    expect(window.sessionStorage.getItem("axon.session-recovery.v1")).toBeNull();
  });

  it("ignores and clears a corrupt record", () => {
    window.sessionStorage.setItem("axon.session-recovery.v1", "{not json");
    expect(loadRecoveryRecord(NOW)).toBeNull();
    expect(window.sessionStorage.getItem("axon.session-recovery.v1")).toBeNull();
  });

  it("clears explicitly", () => {
    saveRecoveryRecord({
      projectId: "p1",
      expectedRevision: 1,
      document: doc,
      safeRoute: "/projects/p1",
      now: NOW,
    });
    clearRecoveryRecord();
    expect(loadRecoveryRecord(NOW)).toBeNull();
  });
});
