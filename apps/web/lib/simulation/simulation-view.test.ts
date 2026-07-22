import { BASELINE_SCENARIO, SIMULATION_MODEL_VERSION } from "@axon/architecture-simulation";
import { describe, expect, it } from "vitest";

import {
  buildSimulationState,
  formatRps,
  getSimulationFreshness,
  initialProfile,
} from "./simulation-view";
import { runSimulation } from "@axon/architecture-simulation";
import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";

const NOW = "2026-03-01T00:00:00.000Z";
const LATER = "2026-03-02T00:00:00.000Z";

function sampleDocument(updatedAt = NOW) {
  const document = createSampleArchitectureDocument({
    id: "doc-1",
    projectId: "project-1",
    now: NOW,
  });
  return { ...document, updatedAt };
}

describe("buildSimulationState", () => {
  it("records the model version and the document it ran against", () => {
    const document = sampleDocument();
    const state = buildSimulationState({
      document,
      scenario: BASELINE_SCENARIO,
      profile: initialProfile(),
      result: runSimulation({ document, scenario: BASELINE_SCENARIO }),
      now: NOW,
    });
    expect(state.modelVersion).toBe(SIMULATION_MODEL_VERSION);
    expect(state.documentId).toBe("doc-1");
    expect(state.documentUpdatedAtAtRun).toBe(NOW);
    // The run that those inputs produced is recorded alongside them.
    expect(state.latestRun?.scenarioId).toBe("baseline");
    expect(state.latestRun?.profileRevision).toBe(0);
    expect(state.latestRun?.components.length).toBeGreaterThan(0);
  });
});

describe("getSimulationFreshness", () => {
  const document = sampleDocument();
  const state = buildSimulationState({
    document,
    scenario: BASELINE_SCENARIO,
    profile: initialProfile(),
    result: runSimulation({ document, scenario: BASELINE_SCENARIO }),
    now: NOW,
  });

  it("reports never-run without persisted inputs", () => {
    expect(getSimulationFreshness(null, document)).toBe("never-run");
  });

  it("reports up-to-date when the run matches the document", () => {
    expect(getSimulationFreshness(state, document)).toBe("up-to-date");
  });

  it("reports architecture-changed after an edit", () => {
    expect(getSimulationFreshness(state, sampleDocument(LATER))).toBe("architecture-changed");
  });

  it("reports model-updated when the model version moved on", () => {
    const latestRun = state.latestRun;
    if (latestRun === null) throw new Error("expected a recorded run");
    expect(
      getSimulationFreshness(
        { ...state, latestRun: { ...latestRun, modelVersion: "0.9.0" } },
        document,
      ),
    ).toBe("model-updated");
  });

  it("reports assumptions-changed when the profile was edited after the run", () => {
    const edited = {
      ...state,
      profile: { ...state.profile, revision: state.profile.revision + 1 },
    };
    expect(getSimulationFreshness(edited, document)).toBe("assumptions-changed");
  });

  it("reports never-run when inputs exist but no run was recorded", () => {
    expect(getSimulationFreshness({ ...state, latestRun: null }, document)).toBe("never-run");
  });
});

describe("formatRps", () => {
  it("abbreviates thousands and keeps small rates readable", () => {
    expect(formatRps(12_000)).toBe("12.0k");
    expect(formatRps(1200)).toBe("1.2k");
    expect(formatRps(48)).toBe("48");
    expect(formatRps(4.8)).toBe("4.80");
  });
});
