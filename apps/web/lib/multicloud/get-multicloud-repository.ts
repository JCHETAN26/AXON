import { isClientCloudMode } from "@/lib/persistence/client-mode";

import {
  LocalStorageMultiCloudRepository,
  type MultiCloudRepository,
} from "./multicloud-repository";
import { HttpMultiCloudRepository } from "./http-multicloud-repository";

let repository: MultiCloudRepository | undefined;

export function getMultiCloudRepository(): MultiCloudRepository {
  repository ??= isClientCloudMode()
    ? new HttpMultiCloudRepository()
    : new LocalStorageMultiCloudRepository();
  return repository;
}
