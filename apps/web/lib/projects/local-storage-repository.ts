import {
  PROJECT_SCHEMA_VERSION,
  createEmptyArchitectureDocument,
  safeParseArchitectureDocument,
  safeParseProject,
  type ArchitectureDocument,
  type Project,
} from "@axon/diagram-schema";

import {
  type CreateProjectInput,
  type ProjectRepository,
  type ProjectWithDocument,
} from "./repository";
import { createSampleArchitectureDocument } from "./sample-project";

const PROJECT_INDEX_KEY = "axon.projects.v1";
const DOCUMENT_KEY_PREFIX = "axon.document.v1.";

/**
 * Local-first persistence backed by Web Storage. Every read is validated
 * against the canonical schema; corrupt entries are skipped, never trusted.
 */
export class LocalStorageProjectRepository implements ProjectRepository {
  private readonly storage: Storage;

  constructor(storage: Storage = window.localStorage) {
    this.storage = storage;
  }

  listProjects(): Promise<Project[]> {
    return Promise.resolve(this.readProjectIndex());
  }

  getProject(projectId: string): Promise<ProjectWithDocument | null> {
    const project = this.readProjectIndex().find((candidate) => candidate.id === projectId);
    if (project === undefined) {
      return Promise.resolve(null);
    }
    const document = this.readDocument(project.architectureDocumentId);
    if (document === null) {
      return Promise.resolve(null);
    }
    return Promise.resolve({ project, document });
  }

  createProject(input: CreateProjectInput): Promise<ProjectWithDocument> {
    const now = new Date().toISOString();
    const projectId = crypto.randomUUID();
    const documentId = crypto.randomUUID();

    const document: ArchitectureDocument =
      input.template === "sample"
        ? createSampleArchitectureDocument({ id: documentId, projectId, now })
        : createEmptyArchitectureDocument({
            id: documentId,
            projectId,
            name: input.name,
            now,
          });

    const project: Project = {
      schemaVersion: PROJECT_SCHEMA_VERSION,
      id: projectId,
      name: input.name,
      ...(input.description !== undefined && { description: input.description }),
      createdAt: now,
      updatedAt: now,
      architectureDocumentId: documentId,
    };

    this.storage.setItem(DOCUMENT_KEY_PREFIX + documentId, JSON.stringify(document));
    this.writeProjectIndex([...this.readProjectIndex(), project]);
    return Promise.resolve({ project, document });
  }

  updateDocument(projectId: string, document: ArchitectureDocument): Promise<ProjectWithDocument> {
    const validated = safeParseArchitectureDocument(document);
    if (!validated.success) {
      return Promise.reject(new Error("Refusing to persist an invalid architecture document"));
    }
    const projects = this.readProjectIndex();
    const project = projects.find((candidate) => candidate.id === projectId);
    if (project === undefined) {
      return Promise.reject(new Error(`Unknown project: ${projectId}`));
    }
    if (
      validated.data.id !== project.architectureDocumentId ||
      validated.data.projectId !== project.id
    ) {
      return Promise.reject(new Error("Document identity does not match the project"));
    }
    const updatedProject: Project = { ...project, updatedAt: validated.data.updatedAt };
    this.storage.setItem(DOCUMENT_KEY_PREFIX + validated.data.id, JSON.stringify(validated.data));
    this.writeProjectIndex(
      projects.map((candidate) => (candidate.id === projectId ? updatedProject : candidate)),
    );
    return Promise.resolve({ project: updatedProject, document: validated.data });
  }

  deleteProject(projectId: string): Promise<void> {
    const projects = this.readProjectIndex();
    const project = projects.find((candidate) => candidate.id === projectId);
    if (project !== undefined) {
      this.storage.removeItem(DOCUMENT_KEY_PREFIX + project.architectureDocumentId);
      this.writeProjectIndex(projects.filter((candidate) => candidate.id !== projectId));
    }
    return Promise.resolve();
  }

  private readProjectIndex(): Project[] {
    const raw = this.storage.getItem(PROJECT_INDEX_KEY);
    if (raw === null) {
      return [];
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) {
      return [];
    }
    const projects: Project[] = [];
    for (const entry of parsed) {
      const result = safeParseProject(entry);
      if (result.success) {
        projects.push(result.data);
      }
    }
    return projects;
  }

  private writeProjectIndex(projects: readonly Project[]): void {
    this.storage.setItem(PROJECT_INDEX_KEY, JSON.stringify(projects));
  }

  private readDocument(documentId: string): ArchitectureDocument | null {
    const raw = this.storage.getItem(DOCUMENT_KEY_PREFIX + documentId);
    if (raw === null) {
      return null;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    const result = safeParseArchitectureDocument(parsed);
    return result.success ? result.data : null;
  }
}
