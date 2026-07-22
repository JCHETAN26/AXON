import {
  DEFAULT_SIMULATION_PROFILE,
  SIMULATION_MODEL_VERSION,
  SIMULATION_PROFILE_VERSION,
  SIMULATION_STATE_SCHEMA_VERSION,
  summarizeRun,
  withCapacityProfile,
  type ComponentStatus,
  type ProjectSimulationState,
  type Scenario,
  type SimulationProfile,
  type SimulationResult,
} from "@axon/architecture-simulation";
import { type ArchitectureDocument } from "@axon/diagram-schema";
import { type StatusKind } from "@axon/ui";

/** Whether a persisted simulation still describes the document on screen. */
export type SimulationFreshness =
  "never-run" | "up-to-date" | "architecture-changed" | "model-updated" | "assumptions-changed";

export function getSimulationFreshness(
  state: ProjectSimulationState | null,
  document: ArchitectureDocument,
): SimulationFreshness {
  if (state === null || state.latestRun === null) return "never-run";
  const run = state.latestRun;
  if (run.modelVersion !== SIMULATION_MODEL_VERSION) return "model-updated";
  if (run.profileVersion !== state.profile.version) return "model-updated";
  // The stored run is matched against the exact assumptions that produced it.
  if (run.profileRevision !== state.profile.revision) return "assumptions-changed";
  if (state.documentId !== document.id || run.documentUpdatedAtAtRun !== document.updatedAt) {
    return "architecture-changed";
  }
  return "up-to-date";
}

export interface BuildSimulationStateInput {
  document: ArchitectureDocument;
  scenario: Scenario;
  profile: SimulationProfile;
  /** The run being recorded; null when only inputs are being stored. */
  result: SimulationResult | null;
  now: string;
}

/**
 * Assembles the persisted state: the versioned profile and scenario that were
 * used, plus a summary of the run they produced. Results themselves are always
 * recomputed from the document on screen — the stored run is history.
 */
export function buildSimulationState({
  document,
  scenario,
  profile,
  result,
  now,
}: BuildSimulationStateInput): ProjectSimulationState {
  return {
    schemaVersion: SIMULATION_STATE_SCHEMA_VERSION,
    projectId: document.projectId,
    documentId: document.id,
    modelVersion: SIMULATION_MODEL_VERSION,
    lastRunAt: now,
    documentUpdatedAtAtRun: document.updatedAt,
    scenario,
    capacityProfile: profile.capacityProfile,
    profile,
    latestRun:
      result === null
        ? null
        : summarizeRun({
            result,
            profile,
            documentUpdatedAt: document.updatedAt,
            ranAt: now,
          }),
  };
}

/** The profile a project starts from before any assumptions are edited. */
export function initialProfile(): SimulationProfile {
  return { ...DEFAULT_SIMULATION_PROFILE, version: SIMULATION_PROFILE_VERSION };
}

export { withCapacityProfile };

/** Component status → StatusBadge kind, shared by the list and canvas overlays. */
export const STATUS_KIND: Record<ComponentStatus, StatusKind> = {
  "at-limit": "critical",
  "approaching-limit": "warning",
  "within-capacity": "success",
  offline: "critical",
  "not-modeled": "neutral",
  "no-represented-load": "neutral",
};

export const STATUS_LABEL: Record<ComponentStatus, string> = {
  "at-limit": "At modeled limit",
  "approaching-limit": "Approaching limit",
  "within-capacity": "Within capacity",
  offline: "Assumed offline",
  "not-modeled": "Not modeled",
  "no-represented-load": "No represented load",
};

export function formatRps(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (value >= 10) return value.toFixed(0);
  return value.toFixed(2);
}
