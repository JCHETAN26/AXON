import { describe, expect, it } from "vitest";

import { ComposeImportError } from "./errors";
import { importCompose } from "./import-compose";
import { SAMPLE_COMPOSE } from "./test-support/fixtures";

describe("importCompose", () => {
  it("detects every service and orders nodes deterministically", () => {
    const { candidate } = importCompose(SAMPLE_COMPOSE);
    expect(candidate.nodes.map((node) => node.id)).toEqual([
      "api",
      "cache",
      "db",
      "gateway",
      "queue",
      "worker",
    ]);
  });

  it("classifies recognised infrastructure images with high confidence", () => {
    const byId = new Map(importCompose(SAMPLE_COMPOSE).candidate.nodes.map((n) => [n.id, n]));
    expect(byId.get("db")).toMatchObject({ category: "Database", classification: "high" });
    expect(byId.get("cache")).toMatchObject({ category: "Cache", classification: "high" });
    expect(byId.get("queue")).toMatchObject({ category: "Broker", classification: "high" });
    expect(byId.get("gateway")).toMatchObject({ category: "Gateway", classification: "high" });
    // A built image is a service, at medium confidence.
    expect(byId.get("api")).toMatchObject({ category: "Service", classification: "medium" });
  });

  it("infers edge kinds from the target's role", () => {
    const byId = new Map(importCompose(SAMPLE_COMPOSE).candidate.edges.map((e) => [e.id, e]));
    // api → db is a data edge; api → queue is async; gateway → api is sync.
    expect(byId.get("api--db--data")?.kind).toBe("data");
    expect(byId.get("api--queue--async")?.kind).toBe("async");
    expect(byId.get("gateway--api--sync")?.kind).toBe("sync");
  });

  it("maps non-default networks to groups", () => {
    const { candidate } = importCompose(SAMPLE_COMPOSE);
    expect(candidate.groups.map((group) => group.label).sort()).toEqual(["app", "edge"]);
  });

  it("carries ports and named volumes into node metadata", () => {
    const byId = new Map(importCompose(SAMPLE_COMPOSE).candidate.nodes.map((n) => [n.id, n]));
    expect(byId.get("gateway")?.meta).toContain("ports");
    expect(byId.get("db")?.meta).toContain("pgdata");
  });

  it("is deterministic: two imports are deeply equal", () => {
    expect(importCompose(SAMPLE_COMPOSE)).toEqual(importCompose(SAMPLE_COMPOSE));
  });

  it("stamps the importer version", () => {
    expect(importCompose(SAMPLE_COMPOSE).importerVersion).toBe("1.0.0");
  });

  it("applies a reviewer category override and marks it high confidence", () => {
    const { candidate } = importCompose(SAMPLE_COMPOSE, {
      categoryOverrides: { api: "Compute" },
    });
    const api = candidate.nodes.find((node) => node.id === "api");
    expect(api).toMatchObject({ category: "Compute", classification: "high" });
    expect(api?.rationale).toContain("during review");
  });

  it("rejects a document with no services", () => {
    expect(() => importCompose("networks:\n  app:")).toThrow(ComposeImportError);
  });

  it("classifies an image-less, build-less service as low confidence", () => {
    const result = importCompose("services:\n  mystery:\n    command: sleep 1");
    const node = result.candidate.nodes.find((n) => n.id === "mystery");
    expect(node?.classification).toBe("low");
    expect(result.warnings.some((w) => w.code === "low-confidence-classification")).toBe(true);
  });
});
