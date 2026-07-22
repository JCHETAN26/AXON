import { type AuditFinding } from "@axon/architecture-audit";
import { describe, expect, it } from "vitest";

import { deriveAuditOverlay } from "./audit-overlay-context";

function finding(overrides: Partial<AuditFinding>): AuditFinding {
  return {
    fingerprint: "fp",
    ruleId: "rule",
    ruleVersion: "1.0.0",
    severity: "high",
    title: "Title",
    detected: "Detected",
    elementIds: ["gateway"],
    evidence: [],
    inference: "Inference",
    limitation: "Limitation",
    recommendation: "Recommendation",
    state: "open",
    firstDetectedAt: "2026-01-01T00:00:00.000Z",
    lastSeenAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("deriveAuditOverlay", () => {
  it("marks elements of open findings with the highest severity and a count", () => {
    const overlay = deriveAuditOverlay([
      finding({ fingerprint: "a", severity: "low", elementIds: ["gateway", "app"] }),
      finding({ fingerprint: "b", severity: "high", elementIds: ["gateway"] }),
    ]);
    expect(overlay.get("gateway")).toEqual({ severity: "high", openCount: 2 });
    expect(overlay.get("app")).toEqual({ severity: "low", openCount: 1 });
  });

  it("ignores acknowledged and resolved findings", () => {
    const overlay = deriveAuditOverlay([
      finding({ fingerprint: "a", state: "acknowledged" }),
      finding({ fingerprint: "b", state: "resolved" }),
    ]);
    expect(overlay.size).toBe(0);
  });
});
