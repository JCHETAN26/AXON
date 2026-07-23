/**
 * GitHub App configuration. This is a *separate* credential flow from the
 * identity OAuth App (see auth.ts) — it grants read-only repository access for
 * analysis and must never be merged with login. All values are server-only; the
 * private key never reaches the client. When configuration is absent or
 * incomplete, repository connection is simply disabled (not a boot failure).
 */

export interface GithubAppConfig {
  readonly appId: string;
  readonly clientId: string;
  readonly clientSecret: string;
  /** PEM private key, server-only. Used to mint short-lived installation tokens. */
  readonly privateKey: string;
  readonly slug: string;
  readonly appUrl: string;
}

const PLACEHOLDER = /^(changeme|change-me|placeholder|your[-_]|xxx+|<.*>|example)/i;

/** Supports both real newlines and `\n`-escaped single-line env values. */
function normalizePrivateKey(raw: string): string {
  const value = raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
  return value.trim();
}

function present(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0 && !PLACEHOLDER.test(value.trim());
}

/**
 * Resolves the GitHub App configuration, or null when it is not fully and
 * validly configured. A null result disables repository connection safely.
 */
export function getGithubAppConfig(env: NodeJS.ProcessEnv = process.env): GithubAppConfig | null {
  const appId = env.GITHUB_APP_ID?.trim();
  const clientId = env.GITHUB_APP_CLIENT_ID?.trim();
  const clientSecret = env.GITHUB_APP_CLIENT_SECRET?.trim();
  const privateKeyRaw = env.GITHUB_APP_PRIVATE_KEY;
  const slug = env.GITHUB_APP_SLUG?.trim();
  const appUrl = (env.AXON_APP_URL ?? env.AUTH_URL)?.trim();

  if (
    !present(appId) ||
    !present(clientId) ||
    !present(clientSecret) ||
    !present(slug) ||
    !present(appUrl) ||
    privateKeyRaw === undefined
  ) {
    return null;
  }
  const privateKey = normalizePrivateKey(privateKeyRaw);
  // Must look like a PEM key — guards against a placeholder slipping through.
  if (!privateKey.includes("BEGIN") || !privateKey.includes("PRIVATE KEY")) {
    return null;
  }
  return { appId, clientId, clientSecret, privateKey, slug, appUrl };
}

export function isGithubAppConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return getGithubAppConfig(env) !== null;
}

/** The public GitHub URL where a user installs the App and selects repositories. */
export function githubInstallUrl(config: GithubAppConfig): string {
  return `https://github.com/apps/${encodeURIComponent(config.slug)}/installations/new`;
}

/**
 * The GitHub App webhook secret, used only to verify inbound delivery
 * signatures. Server-only; returns null when unset (webhook processing is then
 * disabled and unsigned deliveries are rejected).
 */
export function getGithubWebhookSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = env.GITHUB_APP_WEBHOOK_SECRET?.trim();
  return present(secret) ? secret : null;
}

/**
 * Whether AXON is allowed to write review output back to GitHub (PR comments /
 * Check Runs). Disabled by default — it requires an explicit opt-in AND a GitHub
 * App permission upgrade (Pull requests / Checks: write). Analysis and in-product
 * review never depend on this; only outbound GitHub writes do.
 */
export function isGithubPrOutputEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.AXON_GITHUB_PR_OUTPUT_ENABLED === "true";
}
