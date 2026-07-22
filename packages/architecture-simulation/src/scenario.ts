import { z } from "zod";

/**
 * A scenario is the question asked of the model: how much traffic, and what
 * is assumed unavailable. It never describes an observed production event.
 */
export const ScenarioSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** Modeled request rate entering the represented front door. */
  requestsPerSecond: z.number().positive(),
  /** Components assumed unavailable for this scenario. */
  offlineNodeIds: z.array(z.string().min(1)),
});

export type Scenario = z.infer<typeof ScenarioSchema>;

export const BASELINE_REQUESTS_PER_SECOND = 1200;

export const BASELINE_SCENARIO: Scenario = {
  id: "baseline",
  label: "Current traffic",
  requestsPerSecond: BASELINE_REQUESTS_PER_SECOND,
  offlineNodeIds: [],
};

/** Presets offered in the workspace; all are projections, not measurements. */
export const SCENARIO_PRESETS: readonly Scenario[] = [
  BASELINE_SCENARIO,
  {
    id: "growth",
    label: "Steady growth (3×)",
    requestsPerSecond: BASELINE_REQUESTS_PER_SECOND * 3,
    offlineNodeIds: [],
  },
  {
    id: "burst",
    label: "Peak burst (10×)",
    requestsPerSecond: BASELINE_REQUESTS_PER_SECOND * 10,
    offlineNodeIds: [],
  },
];
