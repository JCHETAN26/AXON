import { and, eq, isNull } from "drizzle-orm";

import { type Database } from "../db/client";
import { projectComments, projects } from "../db/schema";

export type CommentAnchorKind = "node" | "edge" | "diagram";

export interface ProjectCommentRecord {
  readonly id: string;
  readonly projectId: string;
  readonly authorId: string;
  readonly body: string;
  readonly anchorKind?: CommentAnchorKind;
  readonly anchorId?: string;
  readonly resolvedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateProjectCommentInput {
  readonly projectId: string;
  readonly authorId: string;
  readonly body: string;
  readonly anchorKind?: CommentAnchorKind;
  readonly anchorId?: string;
}

function parseAnchorKind(value: string | null): CommentAnchorKind | undefined {
  if (value === null) return undefined;
  if (value === "node" || value === "edge" || value === "diagram") return value;
  throw new Error(`Unknown comment anchor kind: ${value}.`);
}

function toRecord(row: typeof projectComments.$inferSelect): ProjectCommentRecord {
  const anchorKind = parseAnchorKind(row.anchorKind);
  return {
    id: row.id,
    projectId: row.projectId,
    authorId: row.authorId,
    body: row.body,
    ...(anchorKind !== undefined && { anchorKind }),
    ...(row.anchorId !== null && { anchorId: row.anchorId }),
    ...(row.resolvedAt !== null && { resolvedAt: row.resolvedAt.toISOString() }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class CommentService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
  ) {}

  async listComments(projectId: string): Promise<ProjectCommentRecord[]> {
    await this.assertOwnsProject(projectId);
    const rows = await this.db
      .select()
      .from(projectComments)
      .where(
        and(eq(projectComments.ownerId, this.ownerId), eq(projectComments.projectId, projectId)),
      );
    return rows.map(toRecord).sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  }

  async createComment(input: CreateProjectCommentInput): Promise<ProjectCommentRecord> {
    await this.assertOwnsProject(input.projectId);
    const body = input.body.trim();
    if (body.length === 0) throw new Error("Comment body is required.");
    if (body.length > 2000) throw new Error("Comment body is too long.");
    if ((input.anchorKind === undefined) !== (input.anchorId === undefined)) {
      throw new Error("Comment anchors require both kind and id.");
    }

    const now = new Date();
    const rows = await this.db
      .insert(projectComments)
      .values({
        ownerId: this.ownerId,
        projectId: input.projectId,
        authorId: input.authorId,
        body,
        ...(input.anchorKind !== undefined && { anchorKind: input.anchorKind }),
        ...(input.anchorId !== undefined && { anchorId: input.anchorId }),
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const row = rows[0];
    if (row === undefined) throw new Error("Failed to create comment.");
    return toRecord(row);
  }

  async resolveComment(projectId: string, commentId: string, now = new Date()): Promise<boolean> {
    await this.assertOwnsProject(projectId);
    const rows = await this.db
      .update(projectComments)
      .set({ resolvedAt: now, updatedAt: now })
      .where(
        and(
          eq(projectComments.ownerId, this.ownerId),
          eq(projectComments.projectId, projectId),
          eq(projectComments.id, commentId),
          isNull(projectComments.resolvedAt),
        ),
      )
      .returning({ id: projectComments.id });
    return rows.length > 0;
  }

  private async assertOwnsProject(projectId: string): Promise<void> {
    const rows = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, this.ownerId)))
      .limit(1);
    if (rows[0] === undefined) {
      throw new Error("Project not found.");
    }
  }
}
