import { LocalStorageProjectRepository } from "@/lib/projects/local-storage-repository";
import { fetchJson } from "./http-client";

export interface LocalMigrationCandidate {
  readonly localId: string;
  readonly name: string;
}

export interface MigrationResult {
  readonly migrated: { localName: string; projectId: string }[];
  readonly skipped: { localName: string; reason: string }[];
}

/**
 * Lists the browser-local projects available to migrate. Reads only local
 * storage; performs no network calls, so a signed-in user can review what
 * would move before consenting.
 */
export async function listLocalProjects(): Promise<LocalMigrationCandidate[]> {
  const repo = new LocalStorageProjectRepository();
  const projects = await repo.listProjects();
  return projects.map((project) => ({ localId: project.id, name: project.name }));
}

/**
 * Migrates browser-local projects into the authenticated account. Runs only on
 * explicit user consent (the caller confirms first). The server generates new
 * owner-scoped identifiers; local ids are never trusted. Local data is left
 * intact unless `clearLocalAfter` is set, so migration is non-destructive by
 * default and can be retried.
 */
export async function migrateLocalToCloud(options?: {
  clearLocalAfter?: boolean;
}): Promise<MigrationResult> {
  const repo = new LocalStorageProjectRepository();
  const projects = await repo.listProjects();

  const payload = { projects: [] as { name: string; description?: string; document: unknown }[] };
  for (const project of projects) {
    const withDocument = await repo.getProject(project.id);
    if (withDocument === null) continue;
    payload.projects.push({
      name: project.name,
      ...(project.description !== undefined && { description: project.description }),
      document: withDocument.document,
    });
  }

  const result = await fetchJson<MigrationResult>("/api/migrate", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (options?.clearLocalAfter === true) {
    // Only remove local copies that migrated successfully.
    const migratedNames = new Set(result.migrated.map((entry) => entry.localName));
    for (const project of projects) {
      if (migratedNames.has(project.name)) {
        await repo.deleteProject(project.id);
      }
    }
  }

  return result;
}
