import {
  ARCHITECTURE_SCHEMA_VERSION,
  createEmptyArchitectureDocument,
  parseArchitectureDocument,
  safeParseArchitectureDocument,
  type ArchitectureDocument,
  type Project,
} from "@axon/diagram-schema";
import { and, eq, sql } from "drizzle-orm";

import { type Database } from "../db/client";
import { documents, projects } from "../db/schema";
import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";
import { type CreateProjectInput, type ProjectWithDocument } from "@/lib/projects/repository";

/** Raised when an optimistic-concurrency write loses a race (Checkpoint 2 uses it). */
export class ConcurrencyError extends Error {
  constructor() {
    super("The project was modified by another write. Reload and try again.");
    this.name = "ConcurrencyError";
  }
}

/**
 * Server-side project store. Every method is scoped by the authenticated
 * `ownerId`; a project belonging to another user is indistinguishable from one
 * that does not exist (returns null / affects zero rows), preventing insecure
 * direct object reference and information leaks.
 */
export class ServerProjectRepository {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
  ) {}

  async listProjects(): Promise<Project[]> {
    const rows = await this.db.select().from(projects).where(eq(projects.ownerId, this.ownerId));
    return rows
      .map((row) => this.toProject(row))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  async getProject(projectId: string): Promise<ProjectWithDocument | null> {
    const owned = await this.loadOwnedProjectRow(projectId);
    if (owned === null) return null;
    const document = await this.loadDocument(projectId);
    if (document === null) return null;
    return { project: this.toProject(owned), document };
  }

  async createProject(input: CreateProjectInput): Promise<ProjectWithDocument> {
    const now = new Date();
    const inserted = await this.db
      .insert(projects)
      .values({
        ownerId: this.ownerId,
        name: input.name,
        ...(input.description !== undefined && { description: input.description }),
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const row = inserted[0];
    if (row === undefined) throw new Error("Failed to create project.");

    const nowIso = now.toISOString();
    const document: ArchitectureDocument =
      input.template === "sample"
        ? createSampleArchitectureDocument({ id: row.id, projectId: row.id, now: nowIso })
        : createEmptyArchitectureDocument({
            id: row.id,
            projectId: row.id,
            name: input.name,
            now: nowIso,
          });

    await this.db.insert(documents).values({
      projectId: row.id,
      ownerId: this.ownerId,
      document,
      version: 1,
      updatedAt: now,
    });

    return { project: this.toProject(row), document };
  }

  /**
   * Replaces a project's document. Optionally guarded by `expectedVersion`
   * for optimistic concurrency; a mismatch throws {@link ConcurrencyError}.
   */
  async updateDocument(
    projectId: string,
    document: ArchitectureDocument,
    expectedVersion?: number,
  ): Promise<ProjectWithDocument> {
    const owned = await this.loadOwnedProjectRow(projectId);
    if (owned === null) {
      // Not-found rather than forbidden: never reveal another owner's project.
      throw new Error("Project not found.");
    }
    const validated = parseArchitectureDocument(document);
    if (validated.projectId !== projectId || validated.id !== projectId) {
      throw new Error("Document identity does not match the project.");
    }

    const now = new Date();
    const condition =
      expectedVersion === undefined
        ? eq(documents.projectId, projectId)
        : and(eq(documents.projectId, projectId), eq(documents.version, expectedVersion));

    const updated = await this.db
      .update(documents)
      .set({ document: validated, updatedAt: now, version: sql`${documents.version} + 1` })
      .where(condition)
      .returning({ version: documents.version });

    if (updated.length === 0) {
      throw new ConcurrencyError();
    }

    await this.db
      .update(projects)
      .set({ updatedAt: now })
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, this.ownerId)));

    return {
      project: { ...this.toProject(owned), updatedAt: now.toISOString() },
      document: validated,
    };
  }

  async deleteProject(projectId: string): Promise<void> {
    // Owner-scoped delete; cascades remove the document and artifacts.
    await this.db
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, this.ownerId)));
  }

  /** Current document version, for optimistic-concurrency callers. */
  async getDocumentVersion(projectId: string): Promise<number | null> {
    const rows = await this.db
      .select({ version: documents.version })
      .from(documents)
      .where(and(eq(documents.projectId, projectId), eq(documents.ownerId, this.ownerId)))
      .limit(1);
    return rows[0]?.version ?? null;
  }

  private async loadOwnedProjectRow(projectId: string) {
    const rows = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, this.ownerId)))
      .limit(1);
    return rows[0] ?? null;
  }

  private async loadDocument(projectId: string): Promise<ArchitectureDocument | null> {
    const rows = await this.db
      .select({ document: documents.document })
      .from(documents)
      .where(and(eq(documents.projectId, projectId), eq(documents.ownerId, this.ownerId)))
      .limit(1);
    const raw = rows[0]?.document;
    if (raw === undefined) return null;
    const parsed = safeParseArchitectureDocument(raw);
    return parsed.success ? parsed.data : null;
  }

  private toProject(row: typeof projects.$inferSelect): Project {
    return {
      schemaVersion: "1.0",
      id: row.id,
      name: row.name,
      ...(row.description !== null && { description: row.description }),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      architectureDocumentId: row.id,
    };
  }
}

export { ARCHITECTURE_SCHEMA_VERSION };
