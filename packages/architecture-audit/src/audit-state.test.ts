import { describe, expect, it } from "vitest";

import {
  AUDIT_STATE_SCHEMA_VERSION,
  safeParseProjectAuditState,
  type ProjectAuditState,
} from "./audit-state";

const VALID_STATE: ProjectAuditState = {
  schemaVersion: AUDIT_STATE_SCHEMA_VERSION,
  projectId: "project-1",
  documentId: "doc-1",
  rulesetVersion: "1.0.0",
  lastRunAt: "2026-01-01T00:00:00.000Z",
  documentUpdatedAtAtRun: "2026-01-01T00:00:00.000Z",
  findings: [
    {
      fingerprint: "fp-1",
      ruleId: "single-point-of-failure",
      ruleVersion: "1.0.0",
      severity: "high",
      title: "Potential single point of failure",
      detected: "Structural detection",
      elementIds: ["gateway"],
      evidence: [{ text: "Evidence", elementIds: ["gateway"] }],
      inference: "Based on the current architecture document, structural risk.",
      limitation: "Document-only analysis.",
      recommendation: "Review redundancy.",
      state: "acknowledged",
      firstDetectedAt: "2026-01-01T00:00:00.000Z",
      lastSeenAt: "2026-01-01T00:00:00.000Z",
      acknowledgedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

describe("ProjectAuditStateSchema", () => {
  it("accepts a valid persisted state", () => {
    expect(safeParseProjectAuditState(VALID_STATE).success).toBe(true);
  });

  it("rejects unknown schema versions", () => {
    expect(safeParseProjectAuditState({ ...VALID_STATE, schemaVersion: "0.9" }).success).toBe(
      false,
    );
  });

  it("rejects invalid severities and states", () => {
    const badSeverity = {
      ...VALID_STATE,
      findings: [{ ...VALID_STATE.findings[0], severity: "catastrophic" }],
    };
    expect(safeParseProjectAuditState(badSeverity).success).toBe(false);

    const badState = {
      ...VALID_STATE,
      findings: [{ ...VALID_STATE.findings[0], state: "ignored" }],
    };
    expect(safeParseProjectAuditState(badState).success).toBe(false);
  });

  it("rejects non-ISO timestamps", () => {
    expect(safeParseProjectAuditState({ ...VALID_STATE, lastRunAt: "yesterday" }).success).toBe(
      false,
    );
  });
});
