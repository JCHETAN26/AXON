import { describe, expect, it } from "vitest";

import { DEMO_FINDINGS, EVIDENCE_KIND_LABEL, getNode } from "./demo-architecture";
import { MONITORED_NODE_IDS, MONITORING_TIMELINE } from "./monitoring";

describe("monitoring timeline", () => {
  it("monitors real canonical nodes", () => {
    for (const nodeId of MONITORED_NODE_IDS) {
      expect(() => getNode(nodeId)).not.toThrow();
    }
  });

  it("provides a chronologically ordered timeline ending now", () => {
    expect(MONITORING_TIMELINE.length).toBeGreaterThanOrEqual(4);
    let previous = Number.NEGATIVE_INFINITY;
    for (const step of MONITORING_TIMELINE) {
      expect(step.offsetMinutes).toBeGreaterThan(previous);
      previous = step.offsetMinutes;
    }
    expect(MONITORING_TIMELINE[MONITORING_TIMELINE.length - 1]?.offsetMinutes).toBe(0);
  });

  it("samples every monitored node in every step", () => {
    for (const step of MONITORING_TIMELINE) {
      expect(step.samples.map((sample) => sample.nodeId).sort()).toEqual(
        [...MONITORED_NODE_IDS].sort(),
      );
      for (const sample of step.samples) {
        expect(sample.metrics.length).toBeGreaterThan(0);
      }
    }
  });

  it("develops the incident over time rather than starting active", () => {
    expect(MONITORING_TIMELINE[0]?.incident).toBeNull();
    const finalStep = MONITORING_TIMELINE[MONITORING_TIMELINE.length - 1];
    expect(finalStep?.incident).not.toBeNull();
    expect(finalStep?.incident?.affectedNodeId).toBe("auth");
  });

  it("backs the incident with classified evidence and a real related finding", () => {
    const findingIds = new Set(DEMO_FINDINGS.map((finding) => finding.id));
    for (const step of MONITORING_TIMELINE) {
      if (step.incident === null) {
        continue;
      }
      expect(step.incident.confidence).toBeGreaterThanOrEqual(0);
      expect(step.incident.confidence).toBeLessThanOrEqual(100);
      expect(step.incident.evidence.length).toBeGreaterThan(0);
      for (const evidence of step.incident.evidence) {
        expect(EVIDENCE_KIND_LABEL[evidence.kind]).toBeDefined();
      }
      expect(findingIds).toContain(step.incident.relatedFindingId);
    }
  });
});
