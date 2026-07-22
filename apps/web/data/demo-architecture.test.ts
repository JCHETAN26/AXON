import { describe, expect, it } from "vitest";

import {
  DEMO_ASSUMPTIONS,
  DEMO_EDGES,
  DEMO_FINDINGS,
  DEMO_GROUPS,
  DEMO_NODES,
  EVIDENCE_KIND_LABEL,
  FOCUS_FLOW,
  GENERATION_ORDER,
  GENERATION_STAGES,
  SELECTED_NODE_ID,
  findEdge,
  getNode,
} from "./demo-architecture";

describe("demo architecture dataset", () => {
  it("contains the twelve canonical services with unique ids", () => {
    expect(DEMO_NODES).toHaveLength(12);
    expect(new Set(DEMO_NODES.map((node) => node.id)).size).toBe(12);
  });

  it("references only existing nodes from edges, with no self-loops", () => {
    const ids = new Set(DEMO_NODES.map((node) => node.id));
    for (const edge of DEMO_EDGES) {
      expect(ids).toContain(edge.source);
      expect(ids).toContain(edge.target);
      expect(edge.source).not.toBe(edge.target);
    }
    expect(new Set(DEMO_EDGES.map((edge) => edge.id)).size).toBe(DEMO_EDGES.length);
  });

  it("highlights exactly the documented request path", () => {
    expect(DEMO_EDGES.filter((edge) => edge.active).map((edge) => edge.id)).toEqual([
      "cdn-gateway",
      "gateway-app",
      "app-redis",
      "app-postgres",
    ]);
  });

  it("covers async, data and telemetry semantics", () => {
    const kinds = new Set(DEMO_EDGES.map((edge) => edge.kind));
    expect(kinds).toEqual(new Set(["sync", "async", "data", "telemetry"]));
  });

  it("assigns every node to a non-empty declared group", () => {
    const groupIds = new Set(DEMO_GROUPS.map((group) => group.id));
    for (const node of DEMO_NODES) {
      expect(groupIds).toContain(node.groupId);
    }
    for (const group of DEMO_GROUPS) {
      expect(DEMO_NODES.some((node) => node.groupId === group.id)).toBe(true);
    }
  });

  it("attaches the four audit findings to existing nodes", () => {
    expect(DEMO_FINDINGS).toHaveLength(4);
    const severities = DEMO_FINDINGS.map((finding) => [finding.nodeId, finding.severity]);
    expect(severities).toEqual([
      ["auth", "critical"],
      ["rabbitmq", "high"],
      ["postgres", "high"],
      ["datadog", "healthy"],
    ]);
    for (const finding of DEMO_FINDINGS) {
      expect(() => getNode(finding.nodeId)).not.toThrow();
    }
  });

  it("keeps the mobile focus flow connected by real edges", () => {
    for (let index = 1; index < FOCUS_FLOW.length; index += 1) {
      const source = FOCUS_FLOW[index - 1];
      const target = FOCUS_FLOW[index];
      expect(source).toBeDefined();
      expect(target).toBeDefined();
      if (source !== undefined && target !== undefined) {
        expect(findEdge(source, target)).toBeDefined();
      }
    }
  });

  it("selects a node that exists", () => {
    expect(() => getNode(SELECTED_NODE_ID)).not.toThrow();
  });

  it("gives every finding bounded confidence, classified evidence and a recommendation", () => {
    for (const finding of DEMO_FINDINGS) {
      expect(finding.confidence).toBeGreaterThanOrEqual(0);
      expect(finding.confidence).toBeLessThanOrEqual(100);
      expect(finding.explanation.length).toBeGreaterThan(0);
      expect(finding.recommendation.length).toBeGreaterThan(0);
      expect(finding.evidence.length).toBeGreaterThan(0);
      for (const evidence of finding.evidence) {
        expect(EVIDENCE_KIND_LABEL[evidence.kind]).toBeDefined();
        expect(evidence.text.length).toBeGreaterThan(0);
      }
    }
  });

  it("generates every node exactly once in dependency order", () => {
    expect(GENERATION_ORDER).toHaveLength(DEMO_NODES.length);
    expect(new Set(GENERATION_ORDER).size).toBe(DEMO_NODES.length);
    for (const id of GENERATION_ORDER) {
      expect(() => getNode(id)).not.toThrow();
    }
  });

  it("declares generation stages ending in completion", () => {
    expect(GENERATION_STAGES.length).toBeGreaterThanOrEqual(4);
    expect(GENERATION_STAGES[GENERATION_STAGES.length - 1]?.id).toBe("complete");
  });

  it("provides the structured prompt assumptions", () => {
    expect(DEMO_ASSUMPTIONS).toHaveLength(7);
    expect(new Set(DEMO_ASSUMPTIONS.map((assumption) => assumption.id)).size).toBe(7);
    for (const assumption of DEMO_ASSUMPTIONS) {
      expect(assumption.label.length).toBeGreaterThan(0);
      expect(assumption.value.length).toBeGreaterThan(0);
    }
  });
});
