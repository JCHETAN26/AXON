import { isClientCloudMode } from "@/lib/persistence/client-mode";

import { HttpPresentationRepository } from "./http-presentation-repository";
import {
  LocalStoragePresentationRepository,
  type PresentationRepository,
} from "./presentation-repository";

let repository: PresentationRepository | undefined;

export function getPresentationRepository(): PresentationRepository {
  repository ??= isClientCloudMode()
    ? new HttpPresentationRepository()
    : new LocalStoragePresentationRepository();
  return repository;
}
