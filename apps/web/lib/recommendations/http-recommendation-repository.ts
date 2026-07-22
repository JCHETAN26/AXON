import { type ProjectRecommendationState } from "@axon/architecture-recommendations";

import { HttpArtifactClient } from "@/lib/persistence/http-artifact-client";
import { type RecommendationRepository } from "./recommendation-repository";

/** Cloud-mode recommendation store over the owner-scoped artifacts route. */
export class HttpRecommendationRepository implements RecommendationRepository {
  private readonly client = new HttpArtifactClient("recommendation");

  getRecommendationState(projectId: string): Promise<ProjectRecommendationState | null> {
    return this.client.get<ProjectRecommendationState>(projectId);
  }

  saveRecommendationState(state: ProjectRecommendationState): Promise<void> {
    return this.client.save(state.projectId, state);
  }

  deleteRecommendationState(projectId: string): Promise<void> {
    return this.client.delete(projectId);
  }
}
