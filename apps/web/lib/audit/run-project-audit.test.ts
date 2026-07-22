import { RULESET_VERSION } from "@axon/architecture-audit";
import { describe, expect, it } from "vitest";

import { computeNextAuditState, getAuditFreshness } from "./run-project-audit";
import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";

const NOW = "2026-02-01T00:00:00.000Z";
const LATER = "2026-02-02T00:00:00.000Z";

function sampleDocument(updatedAt = NOW) {
  const document = createSampleArchitectureDocument({
    id: "doc-1",
    projectId: "project-1",
    now: NOW,
  });
  return { ...document, updatedAt };
}

describe("computeNextAuditState", () => {
  it("audits the sample document into the expected persisted findings", () => {
    const state = computeNextAuditState({ document: sampleDocument(), previous: null, now: NOW });
    expect(state.projectId).toBe("project-1");
    expect(state.documentId).toBe("doc-1");
    expect(state.rulesetVersion).toBe(RULESET_VERSION);
    expect(state.documentUpdatedAtAtRun).toBe(NOW);
    // 3 structural SPOFs, one missing dead-letter path, one telemetry gap.
    expect(state.findings).toHaveLength(5);
    expect(state.findings.every((finding) => finding.state === "open")).toBe(true);
    const titles = state.findings.map((finding) => finding.title);
    expect(titles).toContain('Potential single point of failure: "api-gateway"');
    expect(titles).toContain('No dead-letter path is represented for "rabbitmq"');
  });

  it("carries acknowledged findings across reruns", () => {
    const first = computeNextAuditState({ document: sampleDocument(), previous: null, now: NOW });
    const acknowledged = {
      ...first,
      findings: first.findings.map((finding, index) =>
        index === 0 ? { ...finding, state: "acknowledged" as const, acknowledgedAt: NOW } : finding,
      ),
    };
    const second = computeNextAuditState({
      document: sampleDocument(LATER),
      previous: acknowledged,
      now: LATER,
    });
    const carried = second.findings.find(
      (finding) => finding.fingerprint === first.findings[0]?.fingerprint,
    );
    expect(carried?.state).toBe("acknowledged");
    expect(carried?.acknowledgedAt).toBe(NOW);
  });
});

describe("getAuditFreshness", () => {
  const document = sampleDocument();

  it("reports never-run without persisted state", () => {
    expect(getAuditFreshness(null, document)).toBe("never-run");
  });

  it("reports up-to-date when the run matches the document", () => {
    const state = computeNextAuditState({ document, previous: null, now: NOW });
    expect(getAuditFreshness(state, document)).toBe("up-to-date");
  });

  it("reports architecture-changed when the document was edited after the run", () => {
    const state = computeNextAuditState({ document, previous: null, now: NOW });
    expect(getAuditFreshness(state, sampleDocument(LATER))).toBe("architecture-changed");
  });

  it("reports ruleset-updated when the persisted run used another ruleset", () => {
    const state = computeNextAuditState({ document, previous: null, now: NOW });
    expect(getAuditFreshness({ ...state, rulesetVersion: "0.9.0" }, document)).toBe(
      "ruleset-updated",
    );
  });
});
