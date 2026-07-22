import { type ArchitectureDocument, type Project } from "@axon/diagram-schema";

import { HttpError, fetchJson } from "@/lib/persistence/http-client";
import {
  type CreateProjectInput,
  type ProjectRepository,
  type ProjectWithDocument,
} from "./repository";

interface ProjectResponse extends ProjectWithDocument {
  version?: number;
}

/**
 * Cloud-mode project store. Implements the same interface as the local-storage
 * repository so the workspace is agnostic to where data lives. Authorization
 * and owner-scoping happen entirely on the server; a not-found response for
 * another user's project is surfaced as null, matching local semantics.
 *
 * The last server revision observed for each project is tracked and sent as
 * `expectedVersion` on the next save, so a stale tab's write is rejected with a
 * 409 revision conflict rather than silently overwriting a newer save. The
 * cache is refreshed from every server response and re-seeded by a reload.
 */
export class HttpProjectRepository implements ProjectRepository {
  private readonly versions = new Map<string, number>();

  private rememberVersion(projectId: string, version: number | undefined): void {
    if (typeof version === "number") this.versions.set(projectId, version);
  }

  async listProjects(): Promise<Project[]> {
    const body = await fetchJson<{ projects: Project[] }>("/api/projects");
    return body.projects;
  }

  async getProject(projectId: string): Promise<ProjectWithDocument | null> {
    try {
      const body = await fetchJson<ProjectResponse>(
        `/api/projects/${encodeURIComponent(projectId)}`,
      );
      this.rememberVersion(projectId, body.version);
      return { project: body.project, document: body.document };
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return null;
      throw error;
    }
  }

  async createProject(input: CreateProjectInput): Promise<ProjectWithDocument> {
    const body = await fetchJson<ProjectResponse>("/api/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
    this.rememberVersion(body.project.id, body.version);
    return { project: body.project, document: body.document };
  }

  async updateDocument(
    projectId: string,
    document: ArchitectureDocument,
  ): Promise<ProjectWithDocument> {
    const expectedVersion = this.versions.get(projectId);
    const body = await fetchJson<ProjectResponse>(
      `/api/projects/${encodeURIComponent(projectId)}`,
      {
        method: "PUT",
        body: JSON.stringify(
          expectedVersion === undefined ? { document } : { document, expectedVersion },
        ),
      },
    );
    this.rememberVersion(projectId, body.version);
    return { project: body.project, document: body.document };
  }

  async deleteProject(projectId: string): Promise<void> {
    await fetchJson(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: "DELETE",
      parse: false,
    });
  }
}
