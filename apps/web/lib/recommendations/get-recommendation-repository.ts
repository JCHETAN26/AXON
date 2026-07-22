import { isClientCloudMode } from "@/lib/persistence/client-mode";
import { HttpRecommendationRepository } from "./http-recommendation-repository";
import {
  LocalStorageRecommendationRepository,
  type RecommendationRepository,
} from "./recommendation-repository";

let repository: RecommendationRepository | undefined;

export function getRecommendationRepository(): RecommendationRepository {
  repository ??= isClientCloudMode()
    ? new HttpRecommendationRepository()
    : new LocalStorageRecommendationRepository();
  return repository;
}
