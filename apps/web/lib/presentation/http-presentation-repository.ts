import { HttpArtifactClient } from "@/lib/persistence/http-artifact-client";

import { type PresentationRepository } from "./presentation-repository";
import { type PresentationState } from "./presentation-state";

export class HttpPresentationRepository implements PresentationRepository {
  private readonly client = new HttpArtifactClient("presentation");

  getPresentationState(projectId: string): Promise<PresentationState | null> {
    return this.client.get<PresentationState>(projectId);
  }

  savePresentationState(state: PresentationState): Promise<void> {
    return this.client.save(state.projectId, state);
  }

  deletePresentationState(projectId: string): Promise<void> {
    return this.client.delete(projectId);
  }
}
