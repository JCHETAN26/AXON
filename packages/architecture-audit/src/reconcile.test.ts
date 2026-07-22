import { describe, expect, it } from "vitest";

import { type AuditFinding } from "./audit-state";
import { reconcileFindings, setFindingState } from "./reconcile";
import { type FindingCandidate } from "./types";

const T0 = "2026-01-01T00:00:00.000Z";
const T1 = "2026-01-02T00:00:00.000Z";
const T2 = "2026-01-03T00:00:00.000Z";

function candidate(overrides: Partial<FindingCandidate> = {}): FindingCandidate {
  return {
    ruleId: "single-point-of-failure",
    ruleVersion: "1.0.0",
    fingerprint: "fp-1",
    severity: "high",
    title: "Potential single point of failure",
    detected: "Structural detection",
    elementIds: ["gateway"],
    evidence: [{ text: "Evidence", elementIds: ["gateway"] }],
    inference: "Based on the current architecture document, structural risk.",
    limitation: "Document-only analysis.",
    recommendation: "Review redundancy.",
    ...overrides,
  };
}

function finding(overrides: Partial<AuditFinding> = {}): AuditFinding {
  return {
    ...candidate(),
    elementIds: ["gateway"],
    evidence: [{ text: "Evidence", elementIds: ["gateway"] }],
    state: "open",
    firstDetectedAt: T0,
    lastSeenAt: T0,
    ...overrides,
  };
}

describe("reconcileFindings", () => {
  it("opens new findings with fresh timestamps", () => {
    const result = reconcileFindings({ previous: [], candidates: [candidate()], now: T1 });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ state: "open", firstDetectedAt: T1, lastSeenAt: T1 });
  });

  it("keeps open findings open and preserves firstDetectedAt", () => {
    const result = reconcileFindings({
      previous: [finding()],
      candidates: [candidate()],
      now: T1,
    });
    expect(result[0]).toMatchObject({ state: "open", firstDetectedAt: T0, lastSeenAt: T1 });
  });

  it("carries acknowledgements across reruns", () => {
    const result = reconcileFindings({
      previous: [finding({ state: "acknowledged", acknowledgedAt: T0 })],
      candidates: [candidate()],
      now: T1,
    });
    expect(result[0]).toMatchObject({ state: "acknowledged", acknowledgedAt: T0, lastSeenAt: T1 });
  });

  it("reopens resolved findings that reappear, clearing state timestamps", () => {
    const result = reconcileFindings({
      previous: [finding({ state: "resolved", resolvedAt: T1, acknowledgedAt: T0 })],
      candidates: [candidate()],
      now: T2,
    });
    expect(result[0]).toMatchObject({ state: "open", firstDetectedAt: T0, lastSeenAt: T2 });
    expect(result[0]?.resolvedAt).toBeUndefined();
    expect(result[0]?.acknowledgedAt).toBeUndefined();
  });

  it("auto-resolves open and acknowledged findings that disappear", () => {
    const result = reconcileFindings({
      previous: [
        finding({ fingerprint: "fp-open" }),
        finding({ fingerprint: "fp-ack", state: "acknowledged", acknowledgedAt: T0 }),
      ],
      candidates: [],
      now: T1,
    });
    expect(result.every((item) => item.state === "resolved")).toBe(true);
    expect(result.every((item) => item.resolvedAt === T1)).toBe(true);
  });

  it("keeps already-resolved findings as history, untouched", () => {
    const resolved = finding({ state: "resolved", resolvedAt: T1 });
    const result = reconcileFindings({ previous: [resolved], candidates: [], now: T2 });
    expect(result).toEqual([resolved]);
  });

  it("refreshes content fields from the latest candidate", () => {
    const result = reconcileFindings({
      previous: [finding({ title: "Old title" })],
      candidates: [candidate({ title: "New title", severity: "medium" })],
      now: T1,
    });
    expect(result[0]).toMatchObject({ title: "New title", severity: "medium" });
  });

  it("sorts output by severity, rule id, then fingerprint", () => {
    const result = reconcileFindings({
      previous: [],
      candidates: [
        candidate({ fingerprint: "fp-low", ruleId: "telemetry-coverage", severity: "low" }),
        candidate({ fingerprint: "fp-high-b" }),
        candidate({ fingerprint: "fp-high-a" }),
      ],
      now: T1,
    });
    expect(result.map((item) => item.fingerprint)).toEqual(["fp-high-a", "fp-high-b", "fp-low"]);
  });
});

describe("setFindingState", () => {
  it("acknowledges an open finding", () => {
    const result = setFindingState([finding()], "fp-1", "acknowledged", T1);
    expect(result[0]).toMatchObject({ state: "acknowledged", acknowledgedAt: T1 });
  });

  it("reopens an acknowledged finding and clears acknowledgedAt", () => {
    const acknowledged = finding({ state: "acknowledged", acknowledgedAt: T1 });
    const result = setFindingState([acknowledged], "fp-1", "open", T2);
    expect(result[0]?.state).toBe("open");
    expect(result[0]?.acknowledgedAt).toBeUndefined();
  });

  it("refuses to change resolved findings — resolution only happens via rerun", () => {
    const resolved = [finding({ state: "resolved", resolvedAt: T1 })];
    expect(setFindingState(resolved, "fp-1", "acknowledged", T2)).toBe(resolved);
    expect(setFindingState(resolved, "fp-1", "open", T2)).toBe(resolved);
  });

  it("returns the input unchanged for unknown fingerprints", () => {
    const findings = [finding()];
    expect(setFindingState(findings, "fp-unknown", "acknowledged", T1)).toBe(findings);
  });
});
