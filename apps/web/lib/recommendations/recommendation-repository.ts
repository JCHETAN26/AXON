import {
  safeParseProjectRecommendationState,
  type ProjectRecommendationState,
} from "@axon/architecture-recommendations";

const RECOMMENDATION_KEY_PREFIX = "axon.recommendations.v1.";

/**
 * Persistence boundary for applied recommendations, mirroring the project,
 * audit, and simulation repositories. Recommendations themselves are
 * recomputed from findings; only the applied history is stored.
 */
export interface RecommendationRepository {
  getRecommendationState(projectId: string): Promise<ProjectRecommendationState | null>;
  saveRecommendationState(state: ProjectRecommendationState): Promise<void>;
  deleteRecommendationState(projectId: string): Promise<void>;
}

export class LocalStorageRecommendationRepository implements RecommendationRepository {
  private readonly storage: Storage;

  constructor(storage: Storage = window.localStorage) {
    this.storage = storage;
  }

  getRecommendationState(projectId: string): Promise<ProjectRecommendationState | null> {
    const raw = this.storage.getItem(RECOMMENDATION_KEY_PREFIX + projectId);
    if (raw === null) {
      return Promise.resolve(null);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return Promise.resolve(null);
    }
    const result = safeParseProjectRecommendationState(parsed);
    return Promise.resolve(result.success ? result.data : null);
  }

  saveRecommendationState(state: ProjectRecommendationState): Promise<void> {
    const validated = safeParseProjectRecommendationState(state);
    if (!validated.success) {
      return Promise.reject(new Error("Refusing to persist an invalid recommendation state"));
    }
    this.storage.setItem(
      RECOMMENDATION_KEY_PREFIX + validated.data.projectId,
      JSON.stringify(validated.data),
    );
    return Promise.resolve();
  }

  deleteRecommendationState(projectId: string): Promise<void> {
    this.storage.removeItem(RECOMMENDATION_KEY_PREFIX + projectId);
    return Promise.resolve();
  }
}
