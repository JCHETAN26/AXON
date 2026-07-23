import { and, eq } from "drizzle-orm";

import { type Database } from "../db/client";
import { connectedRepositories, githubInstallations } from "../db/schema";
import { type InstallationInfo, type RemoteRepository } from "../github/gateway";

/** Raised when a user tries to claim an installation already bound to someone else. */
export class InstallationClaimError extends Error {
  constructor() {
    super("This GitHub installation is already connected to another account.");
    this.name = "InstallationClaimError";
  }
}

export type InstallationConnection = typeof githubInstallations.$inferSelect;
export type RepositoryConnection = typeof connectedRepositories.$inferSelect;

/**
 * Owner-scoped store for GitHub installation + repository connections. Every
 * method is filtered by the authenticated `ownerId`; another user's connection
 * is indistinguishable from one that does not exist. No access tokens are ever
 * stored here — only safe references and metadata.
 */
export class ServerGithubRepository {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
  ) {}

  /**
   * Binds an installation to this owner, idempotently. Re-linking the same
   * installation refreshes its metadata; an installation already bound to a
   * different owner is rejected (no silent transfer).
   */
  async linkInstallation(info: InstallationInfo): Promise<InstallationConnection> {
    const existing = await this.db
      .select()
      .from(githubInstallations)
      .where(eq(githubInstallations.installationId, info.installationId))
      .limit(1);
    const now = new Date();

    if (existing[0] !== undefined) {
      if (existing[0].ownerId !== this.ownerId) throw new InstallationClaimError();
      const updated = await this.db
        .update(githubInstallations)
        .set({
          accountId: info.accountId,
          accountLogin: info.accountLogin,
          accountType: info.accountType,
          permissionsSnapshot: info.permissions,
          status: "connected",
          lastVerifiedAt: now,
          updatedAt: now,
        })
        .where(eq(githubInstallations.id, existing[0].id))
        .returning();
      const row = updated[0];
      if (row === undefined) throw new Error("Failed to update installation.");
      return row;
    }

    const inserted = await this.db
      .insert(githubInstallations)
      .values({
        ownerId: this.ownerId,
        installationId: info.installationId,
        accountId: info.accountId,
        accountLogin: info.accountLogin,
        accountType: info.accountType,
        permissionsSnapshot: info.permissions,
        connectedAt: now,
        lastVerifiedAt: now,
      })
      .returning();
    const row = inserted[0];
    if (row === undefined) throw new Error("Failed to create installation.");
    return row;
  }

  async listInstallations(): Promise<InstallationConnection[]> {
    return this.db
      .select()
      .from(githubInstallations)
      .where(eq(githubInstallations.ownerId, this.ownerId));
  }

  async getInstallation(connectionId: string): Promise<InstallationConnection | null> {
    const rows = await this.db
      .select()
      .from(githubInstallations)
      .where(
        and(eq(githubInstallations.id, connectionId), eq(githubInstallations.ownerId, this.ownerId)),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async disconnectInstallation(connectionId: string): Promise<void> {
    // Owner-scoped; cascades remove repositories, runs, evidence, and proposals.
    await this.db
      .delete(githubInstallations)
      .where(
        and(eq(githubInstallations.id, connectionId), eq(githubInstallations.ownerId, this.ownerId)),
      );
  }

  /** Connects a granted repository under an owned installation, idempotently. */
  async connectRepository(
    installationConnectionId: string,
    remote: RemoteRepository,
  ): Promise<RepositoryConnection | null> {
    const installation = await this.getInstallation(installationConnectionId);
    if (installation === null) return null; // not this owner's installation

    const now = new Date();
    const existing = await this.db
      .select()
      .from(connectedRepositories)
      .where(
        and(
          eq(connectedRepositories.ownerId, this.ownerId),
          eq(connectedRepositories.repoGithubId, remote.repoGithubId),
        ),
      )
      .limit(1);

    const values = {
      ownerLogin: remote.ownerLogin,
      name: remote.name,
      fullName: remote.fullName,
      defaultBranch: remote.defaultBranch,
      visibility: remote.visibility,
      archived: remote.archived,
      url: remote.url,
      updatedAt: now,
    };

    if (existing[0] !== undefined) {
      const updated = await this.db
        .update(connectedRepositories)
        .set(values)
        .where(eq(connectedRepositories.id, existing[0].id))
        .returning();
      return updated[0] ?? null;
    }

    const inserted = await this.db
      .insert(connectedRepositories)
      .values({
        ownerId: this.ownerId,
        installationConnectionId,
        repoGithubId: remote.repoGithubId,
        ...values,
      })
      .returning();
    return inserted[0] ?? null;
  }

  async listRepositories(installationConnectionId?: string): Promise<RepositoryConnection[]> {
    const where =
      installationConnectionId === undefined
        ? eq(connectedRepositories.ownerId, this.ownerId)
        : and(
            eq(connectedRepositories.ownerId, this.ownerId),
            eq(connectedRepositories.installationConnectionId, installationConnectionId),
          );
    return this.db.select().from(connectedRepositories).where(where);
  }

  async getRepository(repositoryConnectionId: string): Promise<RepositoryConnection | null> {
    const rows = await this.db
      .select()
      .from(connectedRepositories)
      .where(
        and(
          eq(connectedRepositories.id, repositoryConnectionId),
          eq(connectedRepositories.ownerId, this.ownerId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async disconnectRepository(repositoryConnectionId: string): Promise<void> {
    await this.db
      .delete(connectedRepositories)
      .where(
        and(
          eq(connectedRepositories.id, repositoryConnectionId),
          eq(connectedRepositories.ownerId, this.ownerId),
        ),
      );
  }
}
