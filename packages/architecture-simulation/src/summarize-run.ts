import { type SimulationProfile } from "./profile";
import { type SimulationRun } from "./simulation-state";
import { type SimulationResult } from "./types";

export interface SummarizeRunInput {
  readonly result: SimulationResult;
  readonly profile: SimulationProfile;
  readonly documentUpdatedAt: string;
  readonly ranAt: string;
}

/**
 * Compresses a full result into the persisted run record. Only the fields
 * needed to report staleness and recall the headline outcome are kept —
 * evidence is always recomputed, never restored from storage.
 */
export function summarizeRun({
  result,
  profile,
  documentUpdatedAt,
  ranAt,
}: SummarizeRunInput): SimulationRun {
  return {
    modelVersion: result.modelVersion,
    profileVersion: profile.version,
    profileRevision: profile.revision,
    scenarioId: result.scenarioId,
    requestsPerSecond: result.requestsPerSecond,
    ranAt,
    documentUpdatedAtAtRun: documentUpdatedAt,
    firstConstraintNodeId: result.firstConstraint?.nodeId ?? null,
    firstConstraintSaturationRps: result.firstConstraint?.saturationRps ?? null,
    components: result.components.map((component) => ({
      nodeId: component.nodeId,
      utilization: component.utilization,
      status: component.status,
    })),
  };
}
