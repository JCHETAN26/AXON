import { describe, expect, it } from "vitest";

import { DEMO_EDGES, DEMO_FINDINGS, DEMO_NODES } from "./demo-architecture";
import {
  BASELINE_VERSION,
  CURRENT_GAPS,
  CURRENT_GRAPH,
  RECOMMENDED_ARCHITECTURE,
  RECOMMENDED_OPERATIONS,
  applyPatches,
  computeDiff,
} from "./recommended-architecture";

describe("recommended architecture patch model", () => {
  it("derives the resulting graph from the baseline rather than hard-coding it", () => {
    const recomputed = applyPatches(CURRENT_GRAPH, RECOMMENDED_OPERATIONS);
    expect(RECOMMENDED_ARCHITECTURE.resultingGraph).toEqual(recomputed);
    expect(RECOMMENDED_ARCHITECTURE.baselineVersion).toBe(BASELINE_VERSION);
    expect(CURRENT_GRAPH.nodes).toHaveLength(DEMO_NODES.length);
    expect(CURRENT_GRAPH.edges).toHaveLength(DEMO_EDGES.length);
  });

  it("references only real audit findings from every operation", () => {
    const findingIds = new Set(DEMO_FINDINGS.map((finding) => finding.id));
    for (const operation of RECOMMENDED_OPERATIONS) {
      expect(operation.sourceFindingIds.length).toBeGreaterThan(0);
      expect(operation.reason.length).toBeGreaterThan(0);
      for (const findingId of operation.sourceFindingIds) {
        expect(findingIds).toContain(findingId);
      }
    }
  });

  it("keeps the resulting graph internally consistent", () => {
    const { nodes, edges } = RECOMMENDED_ARCHITECTURE.resultingGraph;
    const nodeIds = new Set(nodes.map((node) => node.id));
    expect(nodeIds.size).toBe(nodes.length);
    expect(new Set(edges.map((edge) => edge.id)).size).toBe(edges.length);
    for (const edge of edges) {
      expect(nodeIds).toContain(edge.source);
      expect(nodeIds).toContain(edge.target);
    }
  });

  it("adds the required remediation nodes and removes rerouted edges", () => {
    const { nodes, edges } = RECOMMENDED_ARCHITECTURE.resultingGraph;
    const names = nodes.map((node) => node.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "health-aware-lb",
        "pgbouncer",
        "pg-read-replica",
        "dead-letter-queue",
        "us-west-failover",
      ]),
    );
    const edgeIds = new Set(edges.map((edge) => edge.id));
    expect(edgeIds).not.toContain("gateway-auth");
    expect(edgeIds).not.toContain("gateway-app");
    expect(edgeIds).not.toContain("app-postgres");
    expect(edgeIds).toContain("gateway-lb");
    expect(edgeIds).toContain("pooler-postgres");
    expect(edgeIds).toContain("rabbitmq-to-dlq");
  });

  it("marks regional failover as planned, not applied", () => {
    const failover = RECOMMENDED_ARCHITECTURE.resultingGraph.nodes.find(
      (node) => node.id === "region-failover",
    );
    expect(failover?.planned).toBe(true);
    expect(computeDiff().nodeStates.get("region-failover")).toBe("planned");
  });

  it("classifies diff states from the operations", () => {
    const diff = computeDiff();
    expect(diff.nodeStates.get("auth")).toBe("modified");
    expect(diff.nodeStates.get("load-balancer")).toBe("added");
    expect(diff.nodeStates.get("cdn")).toBe("unchanged");
    const removed = diff.edgeChanges.filter((change) => change.kind === "removed");
    expect(removed.map((change) => change.edge.id).sort()).toEqual([
      "app-postgres",
      "gateway-app",
      "gateway-auth",
    ]);
  });

  it("rejects inconsistent patches", () => {
    expect(() =>
      applyPatches(CURRENT_GRAPH, [
        { type: "remove-edge", edgeId: "does-not-exist", reason: "x", sourceFindingIds: [] },
      ]),
    ).toThrow();
    expect(() =>
      applyPatches(CURRENT_GRAPH, [
        {
          type: "add-edge",
          edge: { id: "bad", source: "cdn", target: "pg-pooler", kind: "sync" },
          reason: "x",
          sourceFindingIds: [],
        },
      ]),
    ).toThrow();
  });

  it("ties current gaps to real nodes and findings", () => {
    const findingIds = new Set(DEMO_FINDINGS.map((finding) => finding.id));
    const nodeIds = new Set(DEMO_NODES.map((node) => node.id));
    expect(CURRENT_GAPS.length).toBe(6);
    for (const gap of CURRENT_GAPS) {
      if (gap.nodeId !== undefined) {
        expect(nodeIds).toContain(gap.nodeId);
      }
      if (gap.sourceFindingId !== undefined) {
        expect(findingIds).toContain(gap.sourceFindingId);
      }
    }
  });
});
