import { runSimulation } from "@axon/architecture-simulation";
import { describe, expect, it } from "vitest";

import { deriveSimulationOverlay } from "./simulation-overlay-context";
import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";

const DOCUMENT = createSampleArchitectureDocument({
  id: "doc-1",
  projectId: "project-1",
  now: "2026-03-01T00:00:00.000Z",
});

describe("deriveSimulationOverlay", () => {
  it("keys every component result by node id", () => {
    const overlay = deriveSimulationOverlay(runSimulation({ document: DOCUMENT }));
    expect(overlay.size).toBe(DOCUMENT.nodes.length);
    expect(overlay.get("postgres")?.name).toBe("postgresql");
  });

  it("is empty when no simulation has been run", () => {
    expect(deriveSimulationOverlay(null).size).toBe(0);
  });
});
