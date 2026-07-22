import {
  SIMULATION_STATE_SCHEMA_VERSION,
  type ProjectSimulationState,
} from "@axon/architecture-simulation";
import { beforeEach, describe, expect, it } from "vitest";

import { LocalStorageSimulationRepository } from "./simulation-repository";

const STATE: ProjectSimulationState = {
  schemaVersion: SIMULATION_STATE_SCHEMA_VERSION,
  projectId: "project-1",
  documentId: "doc-1",
  modelVersion: "1.0.0",
  lastRunAt: "2026-01-01T00:00:00.000Z",
  documentUpdatedAtAtRun: "2026-01-01T00:00:00.000Z",
  scenario: {
    id: "baseline",
    label: "Current traffic",
    requestsPerSecond: 1200,
    offlineNodeIds: [],
  },
  capacityProfile: { components: {} },
  profile: {
    id: "default",
    label: "Default assumptions",
    version: "1.0.0",
    revision: 0,
    capacityProfile: { components: {} },
  },
  latestRun: null,
};

describe("LocalStorageSimulationRepository", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips simulation inputs per project", async () => {
    const repository = new LocalStorageSimulationRepository();
    expect(await repository.getSimulationState("project-1")).toBeNull();
    await repository.saveSimulationState(STATE);
    expect(await repository.getSimulationState("project-1")).toEqual(STATE);
    expect(await repository.getSimulationState("project-2")).toBeNull();
  });

  it("treats corrupt or outdated entries as never-run", async () => {
    const repository = new LocalStorageSimulationRepository();
    window.localStorage.setItem("axon.simulation.v1.project-1", "{nope");
    expect(await repository.getSimulationState("project-1")).toBeNull();

    window.localStorage.setItem(
      "axon.simulation.v1.project-1",
      JSON.stringify({ ...STATE, schemaVersion: "0.1" }),
    );
    expect(await repository.getSimulationState("project-1")).toBeNull();
  });

  it("refuses to persist an invalid state", async () => {
    const repository = new LocalStorageSimulationRepository();
    await expect(
      repository.saveSimulationState({
        ...STATE,
        scenario: { ...STATE.scenario, requestsPerSecond: -1 },
      }),
    ).rejects.toThrow(/invalid simulation state/);
  });

  it("deletes simulation state", async () => {
    const repository = new LocalStorageSimulationRepository();
    await repository.saveSimulationState(STATE);
    await repository.deleteSimulationState("project-1");
    expect(await repository.getSimulationState("project-1")).toBeNull();
  });
});
