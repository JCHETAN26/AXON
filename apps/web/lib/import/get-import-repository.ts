import { isClientCloudMode } from "@/lib/persistence/client-mode";
import { HttpImportRepository } from "./http-import-repository";
import { LocalStorageImportRepository, type ImportRepository } from "./import-repository";

let repository: ImportRepository | undefined;

export function getImportRepository(): ImportRepository {
  repository ??= isClientCloudMode()
    ? new HttpImportRepository()
    : new LocalStorageImportRepository();
  return repository;
}
