import { safeParseArchitectureDocument, type ArchitectureDocument } from "@axon/diagram-schema";
import { and, eq, gt, isNull, or } from "drizzle-orm";

import { type Database } from "../db/client";
import { documents, projectShareLinks, projects } from "../db/schema";
import {
  COLLABORATION_ROLES,
  type CollaborationRole,
  assertCollaborationPermission,
} from "./permissions";
import { createShareToken, hashShareToken } from "./share-tokens";

export interface ProjectShareLinkRecord {
  readonly id: string;
  readonly projectId: string;
  readonly role: CollaborationRole;
  readonly label?: string;
  readonly expiresAt?: string;
  readonly revokedAt?: string;
  readonly createdAt: string;
}

export interface CreatedProjectShareLink extends ProjectShareLinkRecord {
  readonly rawToken: string;
}

export interface ResolvedSharedProject {
  readonly projectId: string;
  readonly projectName: string;
  readonly role: CollaborationRole;
  readonly document: ArchitectureDocument;
  readonly shareLinkId: string;
}

export interface CreateProjectShareLinkInput {
  readonly projectId: string;
  readonly role: CollaborationRole;
  readonly label?: string;
  readonly expiresAt?: Date;
}

function parseShareRole(value: string): CollaborationRole {
  if (COLLABORATION_ROLES.includes(value as CollaborationRole)) {
    return value as CollaborationRole;
  }
  throw new Error(`Unknown share-link role: ${value}.`);
}

function toRecord(row: typeof projectShareLinks.$inferSelect): ProjectShareLinkRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    role: parseShareRole(row.role),
    ...(row.label !== null && { label: row.label }),
    ...(row.expiresAt !== null && { expiresAt: row.expiresAt.toISOString() }),
    ...(row.revokedAt !== null && { revokedAt: row.revokedAt.toISOString() }),
    createdAt: row.createdAt.toISOString(),
  };
}

export class ShareLinkService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
  ) {}

  async createShareLink(input: CreateProjectShareLinkInput): Promise<CreatedProjectShareLink> {
    assertCollaborationPermission("owner", "share:create");
    await this.assertOwnsProject(input.projectId);
    if (input.role === "owner") {
      throw new Error("Share links cannot grant owner access.");
    }
    if (input.expiresAt !== undefined && input.expiresAt.getTime() <= Date.now()) {
      throw new Error("Share link expiry must be in the future.");
    }

    const token = createShareToken();
    const rows = await this.db
      .insert(projectShareLinks)
      .values({
        ownerId: this.ownerId,
        projectId: input.projectId,
        tokenHash: token.tokenHash,
        role: input.role,
        ...(input.label !== undefined && { label: input.label }),
        ...(input.expiresAt !== undefined && { expiresAt: input.expiresAt }),
      })
      .returning();
    const row = rows[0];
    if (row === undefined) throw new Error("Failed to create share link.");
    return { ...toRecord(row), rawToken: token.rawToken };
  }

  async listShareLinks(projectId: string): Promise<ProjectShareLinkRecord[]> {
    await this.assertOwnsProject(projectId);
    const rows = await this.db
      .select()
      .from(projectShareLinks)
      .where(
        and(
          eq(projectShareLinks.ownerId, this.ownerId),
          eq(projectShareLinks.projectId, projectId),
        ),
      );
    return rows.map(toRecord).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async revokeShareLink(
    projectId: string,
    shareLinkId: string,
    now = new Date(),
  ): Promise<boolean> {
    await this.assertOwnsProject(projectId);
    const rows = await this.db
      .update(projectShareLinks)
      .set({ revokedAt: now, updatedAt: now })
      .where(
        and(
          eq(projectShareLinks.ownerId, this.ownerId),
          eq(projectShareLinks.projectId, projectId),
          eq(projectShareLinks.id, shareLinkId),
          isNull(projectShareLinks.revokedAt),
        ),
      )
      .returning({ id: projectShareLinks.id });
    return rows.length > 0;
  }

  async resolveShareToken(
    rawToken: string,
    now = new Date(),
  ): Promise<ProjectShareLinkRecord | null> {
    const rows = await this.db
      .select()
      .from(projectShareLinks)
      .where(
        and(
          eq(projectShareLinks.tokenHash, hashShareToken(rawToken)),
          isNull(projectShareLinks.revokedAt),
          or(isNull(projectShareLinks.expiresAt), gt(projectShareLinks.expiresAt, now)),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : toRecord(row);
  }

  async resolveSharedProject(
    rawToken: string,
    now = new Date(),
  ): Promise<ResolvedSharedProject | null> {
    const rows = await this.db
      .select()
      .from(projectShareLinks)
      .where(
        and(
          eq(projectShareLinks.tokenHash, hashShareToken(rawToken)),
          isNull(projectShareLinks.revokedAt),
          or(isNull(projectShareLinks.expiresAt), gt(projectShareLinks.expiresAt, now)),
        ),
      )
      .limit(1);
    const shareLink = rows[0];
    if (shareLink === undefined) return null;

    const projectRows = await this.db
      .select({ projectName: projects.name, document: documents.document })
      .from(projects)
      .innerJoin(
        documents,
        and(eq(documents.projectId, projects.id), eq(documents.ownerId, projects.ownerId)),
      )
      .where(
        and(
          eq(projects.id, shareLink.projectId),
          eq(projects.ownerId, shareLink.ownerId),
          eq(documents.projectId, shareLink.projectId),
          eq(documents.ownerId, shareLink.ownerId),
        ),
      )
      .limit(1);
    const project = projectRows[0];
    if (project === undefined) return null;
    const parsed = safeParseArchitectureDocument(project.document);
    if (!parsed.success) return null;

    return {
      projectId: shareLink.projectId,
      projectName: project.projectName,
      role: parseShareRole(shareLink.role),
      document: parsed.data,
      shareLinkId: shareLink.id,
    };
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
