import { and, eq } from "drizzle-orm";

import { type Database } from "../db/client";
import { artifacts, projects, type ArtifactKind } from "../db/schema";

/**
 * Owner-scoped store for per-project artifacts (audit, recommendation,
 * simulation, import). Reads and writes are gated on both the artifact's
 * `ownerId` and confirmed ownership of the parent project, so one user can
 * never reach another user's audit results, recommendations, simulation
 * profile, or import draft.
 */
export class ServerArtifactRepository {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
  ) {}

  async get<T>(projectId: string, kind: ArtifactKind): Promise<T | null> {
    // Ownership of the parent project is a precondition for any artifact read.
    if (!(await this.ownsProject(projectId))) return null;
    const rows = await this.db
      .select({ payload: artifacts.payload })
      .from(artifacts)
      .where(
        and(
          eq(artifacts.projectId, projectId),
          eq(artifacts.ownerId, this.ownerId),
          eq(artifacts.kind, kind),
        ),
      )
      .limit(1);
    return (rows[0]?.payload as T | undefined) ?? null;
  }

  async save(projectId: string, kind: ArtifactKind, payload: unknown): Promise<void> {
    if (!(await this.ownsProject(projectId))) {
      // Not-found semantics: refuse silently rather than leaking existence.
      throw new Error("Project not found.");
    }
    const now = new Date();
    await this.db
      .insert(artifacts)
      .values({ projectId, ownerId: this.ownerId, kind, payload, updatedAt: now })
      .onConflictDoUpdate({
        target: [artifacts.projectId, artifacts.kind],
        set: { payload, updatedAt: now },
      });
  }

  async delete(projectId: string, kind: ArtifactKind): Promise<void> {
    await this.db
      .delete(artifacts)
      .where(
        and(
          eq(artifacts.projectId, projectId),
          eq(artifacts.ownerId, this.ownerId),
          eq(artifacts.kind, kind),
        ),
      );
  }

  private async ownsProject(projectId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, this.ownerId)))
      .limit(1);
    return rows.length > 0;
  }
}
