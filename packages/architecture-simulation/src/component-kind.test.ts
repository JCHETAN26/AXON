import { describe, expect, it } from "vitest";

import { classifyComponent } from "./component-kind";

import { type ArchitectureNodeModel } from "@axon/diagram-schema";

function node(category: string): ArchitectureNodeModel {
  return { id: "n", name: "n", category };
}

describe("classifyComponent", () => {
  it("maps the sample architecture's categories", () => {
    expect(classifyComponent(node("Edge Network"))).toBe("cache");
    expect(classifyComponent(node("Gateway"))).toBe("service");
    expect(classifyComponent(node("Compute"))).toBe("service");
    expect(classifyComponent(node("Cache"))).toBe("cache");
    expect(classifyComponent(node("Database"))).toBe("database");
    expect(classifyComponent(node("Storage"))).toBe("database");
    expect(classifyComponent(node("Broker"))).toBe("queue");
    expect(classifyComponent(node("Worker"))).toBe("worker");
    expect(classifyComponent(node("External"))).toBe("external");
  });

  it("is case-insensitive", () => {
    expect(classifyComponent(node("DATABASE"))).toBe("database");
    expect(classifyComponent(node("message QUEUE"))).toBe("queue");
  });

  it("leaves unrecognised categories unmodeled rather than guessing", () => {
    expect(classifyComponent(node("Observability"))).toBe("unmodeled");
    expect(classifyComponent(node("Something Novel"))).toBe("unmodeled");
    expect(classifyComponent(node("x"))).toBe("unmodeled");
  });
});
