import { isCloudMode as resolveIsCloudMode } from "./persistence-mode";

/**
 * Whether server-side persistence, auth, beta gating, and generation quotas
 * are active. Delegates to the validated persistence-mode resolver, so a
 * production deployment fails closed instead of silently degrading to
 * anonymous/local behavior when configuration is incomplete.
 *
 * @see persistence-mode.ts
 */
export function isCloudMode(): boolean {
  return resolveIsCloudMode();
}
