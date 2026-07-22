import { describe, expect, it } from "vitest";

import {
  SIMULATION_STATE_SCHEMA_VERSION,
  safeParseProjectSimulationState,
  type ProjectSimulationState,
} from "./simulation-state";

const VALID: ProjectSimulationState = {
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
  capacityProfile: { components: { postgres: { maxConnections: 400 } } },
  profile: {
    id: "default",
    label: "Default assumptions",
    version: "1.0.0",
    revision: 2,
    capacityProfile: { components: { postgres: { maxConnections: 400 } } },
  },
  latestRun: {
    modelVersion: "1.0.0",
    profileVersion: "1.0.0",
    profileRevision: 2,
    scenarioId: "baseline",
    requestsPerSecond: 1200,
    ranAt: "2026-01-01T00:00:00.000Z",
    documentUpdatedAtAtRun: "2026-01-01T00:00:00.000Z",
    firstConstraintNodeId: "postgres",
    firstConstraintSaturationRps: 4390,
    components: [{ nodeId: "postgres", utilization: 0.27, status: "within-capacity" }],
  },
};

describe("ProjectSimulationStateSchema", () => {
  it("accepts a valid persisted state", () => {
    expect(safeParseProjectSimulationState(VALID).success).toBe(true);
  });

  it("accepts a profile that has never been run", () => {
    expect(safeParseProjectSimulationState({ ...VALID, latestRun: null }).success).toBe(true);
  });

  it("rejects a run that does not record its model version", () => {
    const withoutVersion = { ...VALID.latestRun };
    delete (withoutVersion as Record<string, unknown>)["modelVersion"];
    expect(safeParseProjectSimulationState({ ...VALID, latestRun: withoutVersion }).success).toBe(
      false,
    );
  });

  it("rejects unknown schema versions", () => {
    expect(safeParseProjectSimulationState({ ...VALID, schemaVersion: "0.9" }).success).toBe(false);
  });

  it("rejects a non-positive request rate", () => {
    expect(
      safeParseProjectSimulationState({
        ...VALID,
        scenario: { ...VALID.scenario, requestsPerSecond: 0 },
      }).success,
    ).toBe(false);
  });

  it("rejects non-ISO timestamps", () => {
    expect(safeParseProjectSimulationState({ ...VALID, lastRunAt: "today" }).success).toBe(false);
  });
});
