import { isClientCloudMode } from "@/lib/persistence/client-mode";
import { HttpProjectRepository } from "./http-repository";
import { LocalStorageProjectRepository } from "./local-storage-repository";
import { type ProjectRepository } from "./repository";

let repository: ProjectRepository | null = null;

/**
 * Client-side repository singleton. Uses the server-backed repository in cloud
 * mode and browser storage in local mode; the workspace is agnostic to which.
 */
export function getProjectRepository(): ProjectRepository {
  repository ??= isClientCloudMode()
    ? new HttpProjectRepository()
    : new LocalStorageProjectRepository();
  return repository;
}
