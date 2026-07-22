import { describe, expect, it } from "vitest";

import { readArchitectureCapacity } from "./architecture-capacity";
import { runSimulation } from "./run-simulation";
import { buildDocument, buildSampleLikeDocument } from "./test-support/fixtures";

import { type ArchitectureNodeModel } from "@axon/diagram-schema";

function node(meta: string | undefined): ArchitectureNodeModel {
  return { id: "n", name: "n", category: "Service", ...(meta !== undefined && { meta }) };
}

describe("readArchitectureCapacity", () => {
  it("reads a connection ceiling from a database note", () => {
    expect(readArchitectureCapacity(node("conn 82/300"), "database")).toEqual({
      maxConnections: 300,
    });
  });

  it("reads a cache hit rate", () => {
    expect(readArchitectureCapacity(node("hit 97.2%"), "cache")).toEqual({
      cacheHitPercent: 97.2,
    });
  });

  it("reads unit counts from several phrasings", () => {
    expect(readArchitectureCapacity(node("temporal · 8 workers"), "worker")).toEqual({ units: 8 });
    expect(readArchitectureCapacity(node("12 consumers"), "queue")).toEqual({ units: 12 });
    expect(readArchitectureCapacity(node("go · 6 pods"), "service")).toEqual({ units: 6 });
    expect(readArchitectureCapacity(node("2 pods · single az"), "service")).toEqual({ units: 2 });
  });

  it("expands a k-suffixed rate limit", () => {
    expect(readArchitectureCapacity(node("rate-limit 5k/s"), "service")).toEqual({
      requestsPerSecondPerUnit: 5000,
    });
  });

  it("ignores hints that do not apply to the component kind", () => {
    // A hit rate on a database says nothing AXON models about databases.
    expect(readArchitectureCapacity(node("hit 97.2%"), "database")).toEqual({});
    expect(readArchitectureCapacity(node("conn 82/300"), "service")).toEqual({});
  });

  it("returns nothing for absent or unrecognised notes", () => {
    expect(readArchitectureCapacity(node(undefined), "service")).toEqual({});
    expect(readArchitectureCapacity(node("pci scope"), "service")).toEqual({});
    expect(readArchitectureCapacity(node("14.2k rps · p95 42ms"), "service")).toEqual({});
  });

  it("is deterministic", () => {
    const subject = node("conn 82/300");
    expect(readArchitectureCapacity(subject, "database")).toEqual(
      readArchitectureCapacity(subject, "database"),
    );
  });
});

describe("architecture-provided assumptions in a run", () => {
  it("attributes a value read from the document to the architecture", () => {
    const document = buildDocument(
      [
        { id: "front", category: "Service" },
        { id: "db", category: "Database", meta: "conn 82/300" },
      ],
      [["front", "db", "data"]],
    );
    const result = runSimulation({ document });
    const db = result.components.find((component) => component.nodeId === "db");
    const limit = db?.evidence.find((item) => item.label === "Connection limit");
    expect(limit).toMatchObject({ value: "300", basis: "architecture-input" });
  });

  it("still reports AXON defaults where the architecture is silent", () => {
    const document = buildDocument([{ id: "svc", category: "Service" }]);
    const result = runSimulation({ document });
    const svc = result.components.find((component) => component.nodeId === "svc");
    expect(svc?.evidence.find((item) => item.label === "Units")?.basis).toBe("axon-default");
  });

  it("lets a user override outrank the architecture", () => {
    const document = buildDocument(
      [
        { id: "front", category: "Service" },
        { id: "db", category: "Database", meta: "conn 82/300" },
      ],
      [["front", "db", "data"]],
    );
    const result = runSimulation({
      document,
      capacityProfile: { components: { db: { maxConnections: 900 } } },
    });
    const db = result.components.find((component) => component.nodeId === "db");
    expect(db?.evidence.find((item) => item.label === "Connection limit")).toMatchObject({
      value: "900",
      basis: "user-input",
    });
  });

  it("picks up the sample architecture's documented capacities", () => {
    const result = runSimulation({ document: buildSampleLikeDocument() });
    const redis = result.components.find((component) => component.nodeId === "redis");
    // The sample states "hit 97.2%", which must beat the 90% default.
    expect(redis?.evidence.find((item) => item.label === "Cache hit rate")).toMatchObject({
      value: "97.2%",
      basis: "architecture-input",
    });
  });
});
