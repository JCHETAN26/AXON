import { z } from "zod";

import { CapacityProfileSchema } from "./capacity-profile";
import { SimulationProfileSchema } from "./profile";
import { ScenarioSchema } from "./scenario";

/**
 * Persisted simulation model.
 *
 * Both the *inputs* (profile and scenario) and a summary of the *latest run*
 * are stored. The summary is history, never a source of truth: the workspace
 * always recomputes results from the document on screen, and compares against
 * the stored run only to tell the user whether it is still current.
 */

export const SIMULATION_STATE_SCHEMA_VERSION = "1.1";

const nonEmptyString = z.string().min(1);
const isoDateTime = z.iso.datetime();

/** Compact record of one component's projected outcome. */
export const SimulationRunComponentSchema = z.object({
  nodeId: nonEmptyString,
  utilization: z.number(),
  status: nonEmptyString,
});

export const SimulationRunSchema = z.object({
  modelVersion: nonEmptyString,
  profileVersion: nonEmptyString,
  profileRevision: z.number().int().nonnegative(),
  scenarioId: nonEmptyString,
  requestsPerSecond: z.number().positive(),
  ranAt: isoDateTime,
  /** document.updatedAt when the run happened — the staleness signal. */
  documentUpdatedAtAtRun: isoDateTime,
  firstConstraintNodeId: nonEmptyString.nullable(),
  firstConstraintSaturationRps: z.number().nullable(),
  components: z.array(SimulationRunComponentSchema),
});

export const ProjectSimulationStateSchema = z.object({
  schemaVersion: z.literal(SIMULATION_STATE_SCHEMA_VERSION),
  projectId: nonEmptyString,
  documentId: nonEmptyString,
  modelVersion: nonEmptyString,
  lastRunAt: isoDateTime,
  documentUpdatedAtAtRun: isoDateTime,
  scenario: ScenarioSchema,
  /** Retained for direct access; mirrors profile.capacityProfile. */
  capacityProfile: CapacityProfileSchema,
  profile: SimulationProfileSchema,
  /** Summary of the most recent run, for history and staleness reporting. */
  latestRun: SimulationRunSchema.nullable(),
});

export type SimulationRun = z.infer<typeof SimulationRunSchema>;
export type ProjectSimulationState = z.infer<typeof ProjectSimulationStateSchema>;

export function parseProjectSimulationState(input: unknown): ProjectSimulationState {
  return ProjectSimulationStateSchema.parse(input);
}

export function safeParseProjectSimulationState(input: unknown) {
  return ProjectSimulationStateSchema.safeParse(input);
}
