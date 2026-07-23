import { type Database } from "../db/client";
import { type GithubGateway } from "../github/gateway";
import { getGithubGateway } from "../github/octokit-gateway";
import { PullRequestService } from "../github/pull-request-service";
import { runNextJob, type Job } from "./job-store";

interface WebhookJobPayload {
  repositoryConnectionId?: string;
  prNumber?: number | null;
}

/**
 * Executes a single webhook job. Pull-request jobs run the evidence-based PR
 * analysis (owner-scoped). Push and unrecognized kinds are acknowledged — the
 * delivery is already recorded, and deeper push analysis is a later enhancement.
 * The gateway is injectable for testing.
 */
export async function processWebhookJob(
  db: Database,
  job: Job,
  gateway: GithubGateway | null,
): Promise<void> {
  if (job.ownerId === null) return; // unowned — nothing to analyze
  const payload = (job.payload ?? {}) as WebhookJobPayload;

  if (
    job.kind === "webhook.pull_request" &&
    payload.repositoryConnectionId != null &&
    typeof payload.prNumber === "number"
  ) {
    if (gateway === null) throw new Error("GitHub App is not configured.");
    await new PullRequestService(db, gateway, job.ownerId).analyzePullRequest(
      payload.repositoryConnectionId,
      payload.prNumber,
    );
  }
  // webhook.push and other kinds: acknowledged (the event is already persisted).
}

/**
 * Drains up to `max` queued webhook jobs. This is invoked by an external worker
 * or scheduler — AXON does not run an always-on loop. Returns how many ran.
 */
export async function drainWebhookJobs(
  db: Database,
  gateway: GithubGateway | null = getGithubGateway(),
  max = 25,
): Promise<number> {
  let ran = 0;
  for (let i = 0; i < max; i += 1) {
    const outcome = await runNextJob(db, (job) => processWebhookJob(db, job, gateway));
    if (outcome === null) break;
    ran += 1;
  }
  return ran;
}
