import { type ProjectSimulationState } from "@axon/architecture-simulation";

import { HttpArtifactClient } from "@/lib/persistence/http-artifact-client";
import { type SimulationRepository } from "./simulation-repository";

/** Cloud-mode simulation store over the owner-scoped artifacts route. */
export class HttpSimulationRepository implements SimulationRepository {
  private readonly client = new HttpArtifactClient("simulation");

  getSimulationState(projectId: string): Promise<ProjectSimulationState | null> {
    return this.client.get<ProjectSimulationState>(projectId);
  }

  saveSimulationState(state: ProjectSimulationState): Promise<void> {
    return this.client.save(state.projectId, state);
  }

  deleteSimulationState(projectId: string): Promise<void> {
    return this.client.delete(projectId);
  }
}
