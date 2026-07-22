import {
  safeParseProjectSimulationState,
  type ProjectSimulationState,
} from "@axon/architecture-simulation";

const SIMULATION_KEY_PREFIX = "axon.simulation.v1.";

/**
 * Persistence boundary for simulation inputs, mirroring ProjectRepository and
 * AuditRepository. Results are never persisted — only the scenario and
 * capacity profile that produce them, so a displayed result is always
 * recomputed from the current document.
 */
export interface SimulationRepository {
  getSimulationState(projectId: string): Promise<ProjectSimulationState | null>;
  saveSimulationState(state: ProjectSimulationState): Promise<void>;
  deleteSimulationState(projectId: string): Promise<void>;
}

export class LocalStorageSimulationRepository implements SimulationRepository {
  private readonly storage: Storage;

  constructor(storage: Storage = window.localStorage) {
    this.storage = storage;
  }

  getSimulationState(projectId: string): Promise<ProjectSimulationState | null> {
    const raw = this.storage.getItem(SIMULATION_KEY_PREFIX + projectId);
    if (raw === null) {
      return Promise.resolve(null);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return Promise.resolve(null);
    }
    const result = safeParseProjectSimulationState(parsed);
    return Promise.resolve(result.success ? result.data : null);
  }

  saveSimulationState(state: ProjectSimulationState): Promise<void> {
    const validated = safeParseProjectSimulationState(state);
    if (!validated.success) {
      return Promise.reject(new Error("Refusing to persist an invalid simulation state"));
    }
    this.storage.setItem(
      SIMULATION_KEY_PREFIX + validated.data.projectId,
      JSON.stringify(validated.data),
    );
    return Promise.resolve();
  }

  deleteSimulationState(projectId: string): Promise<void> {
    this.storage.removeItem(SIMULATION_KEY_PREFIX + projectId);
    return Promise.resolve();
  }
}
