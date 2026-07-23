import { and, eq } from "drizzle-orm";

import { type Database } from "../db/client";
import { connectedRepositories, githubInstallations, githubWebhookEvents } from "../db/schema";
import { enqueueJob } from "../jobs/job-store";

/** Events AXON processes; anything else is acknowledged and ignored. */
export const SUPPORTED_WEBHOOK_EVENTS = new Set([
  "push",
  "pull_request",
  "installation",
  "installation_repositories",
]);

/** Events that trigger repository analysis (and therefore a background job). */
const ANALYSIS_EVENTS = new Set(["push", "pull_request"]);

export interface WebhookMeta {
  deliveryId: string;
  eventType: string;
  installationId: number | null;
  repositoryGithubId: number | null;
  prNumber: number | null;
  beforeSha: string | null;
  afterSha: string | null;
}

export type WebhookOutcome =
  | { kind: "duplicate" }
  | { kind: "ignored"; reason: string }
  | { kind: "queued"; jobId: string; ownerId: string };

/**
 * Resolves the owner and connected repository for an installation + repo, or
 * null when the installation is not linked to any account or the repository is
 * not connected. Ownership is derived server-side — never trusted from the
 * webhook payload's names.
 */
async function resolveOwnership(
  db: Database,
  installationId: number | null,
  repoGithubId: number | null,
): Promise<{ ownerId: string; repositoryConnectionId: string | null } | null> {
  if (installationId === null) return null;
  const installs = await db
    .select({ ownerId: githubInstallations.ownerId, id: githubInstallations.id })
    .from(githubInstallations)
    .where(eq(githubInstallations.installationId, installationId))
    .limit(1);
  const install = installs[0];
  if (install === undefined) return null;

  let repositoryConnectionId: string | null = null;
  if (repoGithubId !== null) {
    const repos = await db
      .select({ id: connectedRepositories.id })
      .from(connectedRepositories)
      .where(
        and(
          eq(connectedRepositories.ownerId, install.ownerId),
          eq(connectedRepositories.repoGithubId, repoGithubId),
        ),
      )
      .limit(1);
    repositoryConnectionId = repos[0]?.id ?? null;
  }
  return { ownerId: install.ownerId, repositoryConnectionId };
}

/**
 * Idempotently records a verified webhook delivery and, for analysis events on a
 * connected repository, enqueues a background job. A duplicate delivery id is a
 * no-op. Only safe metadata is persisted — never the payload or any content.
 */
export async function recordWebhookDelivery(db: Database, meta: WebhookMeta): Promise<WebhookOutcome> {
  const ownership = await resolveOwnership(db, meta.installationId, meta.repositoryGithubId);
  const isAnalysis = ANALYSIS_EVENTS.has(meta.eventType);
  const willQueue = isAnalysis && ownership !== null && ownership.repositoryConnectionId !== null;

  // Insert the delivery; a duplicate delivery id conflicts and is ignored.
  const inserted = await db
    .insert(githubWebhookEvents)
    .values({
      deliveryId: meta.deliveryId,
      eventType: meta.eventType,
      installationId: meta.installationId,
      repositoryGithubId: meta.repositoryGithubId,
      prNumber: meta.prNumber,
      beforeSha: meta.beforeSha,
      afterSha: meta.afterSha,
      ownerId: ownership?.ownerId ?? null,
      status: willQueue ? "queued" : "ignored",
    })
    .onConflictDoNothing({ target: githubWebhookEvents.deliveryId })
    .returning({ id: githubWebhookEvents.id });

  if (inserted[0] === undefined) return { kind: "duplicate" };

  if (!willQueue || ownership === null || ownership.repositoryConnectionId === null) {
    const reason = ownership === null ? "unowned" : isAnalysis ? "repo-not-connected" : "no-analysis";
    return { kind: "ignored", reason };
  }

  // The delivery id is the job idempotency key: a duplicate delivery that races
  // past the dedup check still cannot create a second job.
  const jobId = await enqueueJob(db, {
    ownerId: ownership.ownerId,
    kind: `webhook.${meta.eventType}`,
    idempotencyKey: meta.deliveryId,
    payload: {
      repositoryConnectionId: ownership.repositoryConnectionId,
      prNumber: meta.prNumber,
      beforeSha: meta.beforeSha,
      afterSha: meta.afterSha,
    },
  });
  return { kind: "queued", jobId, ownerId: ownership.ownerId };
}
