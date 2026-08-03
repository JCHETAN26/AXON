/**
 * Safe build/version identifier surfaced in exports and health. Never contains
 * environment configuration or secrets — only a short public build id.
 */
function resolveVersion(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.AXON_BUILD_ID?.trim();
  if (explicit !== undefined && explicit !== "") return explicit;
  // Vercel injects the deployed commit automatically, so the reported version
  // tracks what is actually running instead of a literal that goes stale the
  // moment the next deploy lands.
  const commit = env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (commit !== undefined && commit !== "") return commit.slice(0, 7);
  return "beta";
}

export const PRODUCT_VERSION = resolveVersion();
