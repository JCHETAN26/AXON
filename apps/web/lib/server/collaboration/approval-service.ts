import { and, eq } from "drizzle-orm";

import { type Database } from "../db/client";
import { projectApprovals, projects } from "../db/schema";

export type ApprovalSubjectKind = "architecture" | "proposal" | "comment" | "share";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ApprovalDecision = "approved" | "rejected";

export interface ProjectApprovalRecord {
  readonly id: string;
  readonly projectId: string;
  readonly requesterId: string;
  readonly decidedByUserId?: string;
  readonly subjectKind: ApprovalSubjectKind;
  readonly subjectId: string;
  readonly title: string;
  readonly description?: string;
  readonly status: ApprovalStatus;
  readonly decidedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateApprovalInput {
  readonly projectId: string;
  readonly requesterId: string;
  readonly subjectKind: ApprovalSubjectKind;
  readonly subjectId: string;
  readonly title: string;
  readonly description?: string;
}

function parseSubjectKind(value: string): ApprovalSubjectKind {
  if (
    value === "architecture" ||
    value === "proposal" ||
    value === "comment" ||
    value === "share"
  ) {
    return value;
  }
  throw new Error(`Unknown approval subject kind: ${value}.`);
}

function parseStatus(value: string): ApprovalStatus {
  if (value === "pending" || value === "approved" || value === "rejected") {
    return value;
  }
  throw new Error(`Unknown approval status: ${value}.`);
}

function toRecord(row: typeof projectApprovals.$inferSelect): ProjectApprovalRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    requesterId: row.requesterId,
    ...(row.decidedByUserId !== null && { decidedByUserId: row.decidedByUserId }),
    subjectKind: parseSubjectKind(row.subjectKind),
    subjectId: row.subjectId,
    title: row.title,
    ...(row.description !== null && { description: row.description }),
    status: parseStatus(row.status),
    ...(row.decidedAt !== null && { decidedAt: row.decidedAt.toISOString() }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class ApprovalService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
  ) {}

  async listApprovals(projectId: string): Promise<ProjectApprovalRecord[]> {
    await this.assertOwnsProject(projectId);
    const rows = await this.db
      .select()
      .from(projectApprovals)
      .where(
        and(eq(projectApprovals.ownerId, this.ownerId), eq(projectApprovals.projectId, projectId)),
      );
    return rows.map(toRecord).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async createApproval(input: CreateApprovalInput): Promise<ProjectApprovalRecord> {
    await this.assertOwnsProject(input.projectId);
    const title = input.title.trim();
    const subjectId = input.subjectId.trim();
    if (title.length === 0) throw new Error("Approval title is required.");
    if (title.length > 160) throw new Error("Approval title is too long.");
    if (subjectId.length === 0) throw new Error("Approval subject is required.");

    const now = new Date();
    const rows = await this.db
      .insert(projectApprovals)
      .values({
        ownerId: this.ownerId,
        projectId: input.projectId,
        requesterId: input.requesterId,
        subjectKind: input.subjectKind,
        subjectId,
        title,
        ...(input.description !== undefined && { description: input.description.trim() }),
        status: "pending",
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const row = rows[0];
    if (row === undefined) throw new Error("Failed to create approval.");
    return toRecord(row);
  }

  async decideApproval(
    projectId: string,
    approvalId: string,
    decision: ApprovalDecision,
    decidedByUserId: string,
    now = new Date(),
  ): Promise<ProjectApprovalRecord | null> {
    await this.assertOwnsProject(projectId);
    const rows = await this.db
      .update(projectApprovals)
      .set({
        status: decision,
        decidedByUserId,
        decidedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(projectApprovals.ownerId, this.ownerId),
          eq(projectApprovals.projectId, projectId),
          eq(projectApprovals.id, approvalId),
          eq(projectApprovals.status, "pending"),
        ),
      )
      .returning();
    const row = rows[0];
    return row === undefined ? null : toRecord(row);
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
