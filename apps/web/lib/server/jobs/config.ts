/**
 * Background-job worker configuration. The drain endpoint is triggered by an
 * external scheduler/cron (AXON runs no always-on loop), so it is authenticated
 * by a shared bearer secret rather than a user session. The secret is
 * server-only; when it is unset the drain endpoint is disabled entirely.
 */

const PLACEHOLDER = /^(changeme|change-me|placeholder|your[-_]|xxx+|<.*>|example)/i;

function present(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0 && !PLACEHOLDER.test(value.trim());
}

/**
 * The shared secret a scheduler presents (as `Authorization: Bearer <secret>`)
 * to drain queued webhook jobs. Returns null when unset — the drain endpoint is
 * then disabled and returns 503, so it is never an open trigger.
 */
export function getJobsDrainSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = env.AXON_JOBS_DRAIN_SECRET?.trim();
  return present(secret) ? secret : null;
}
