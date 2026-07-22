import { type ArchitectureDocument, type Project } from "@axon/diagram-schema";

export type ProjectTemplate = "blank" | "sample";

export interface CreateProjectInput {
  name: string;
  description?: string;
  template: ProjectTemplate;
}

export interface ProjectWithDocument {
  project: Project;
  document: ArchitectureDocument;
}

/**
 * Persistence abstraction for projects and their architecture documents.
 * Async so a cloud adapter can implement the same contract later; the beta
 * ships with local-first storage only.
 */
export interface ProjectRepository {
  listProjects(): Promise<Project[]>;
  getProject(projectId: string): Promise<ProjectWithDocument | null>;
  createProject(input: CreateProjectInput): Promise<ProjectWithDocument>;
  /** Replaces a project's architecture document (same document id). */
  updateDocument(projectId: string, document: ArchitectureDocument): Promise<ProjectWithDocument>;
  deleteProject(projectId: string): Promise<void>;
}
