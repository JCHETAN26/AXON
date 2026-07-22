import { REQUIRED_LEGAL_ENV } from "@/lib/legal-config";
import { resolvePersistenceMode } from "./persistence-mode";

export interface ConfigProblem {
  readonly variable: string;
  readonly message: string;
}

/**
 * Validates the deployment configuration. Returns the problems found (empty
 * when the configuration is sound). Separated from any process exit so it can
 * be unit tested and reused by the health endpoint and startup check.
 *
 * Enforces the security invariants for production:
 * - a persistence mode must be explicit (validated by the resolver),
 * - cloud mode requires its secrets,
 * - test authentication must be off,
 * - the client persistence flag must match the server mode.
 */
export function validateDeploymentConfig(env: NodeJS.ProcessEnv = process.env): ConfigProblem[] {
  const problems: ConfigProblem[] = [];
  const isProduction = env.NODE_ENV === "production";

  let mode: "local" | "cloud" | null = null;
  try {
    mode = resolvePersistenceMode(env);
  } catch (error) {
    problems.push({
      variable: "AXON_PERSISTENCE_MODE",
      message: error instanceof Error ? error.message : "Invalid persistence configuration.",
    });
  }

  if (isProduction && env.AXON_TEST_AUTH === "1") {
    problems.push({
      variable: "AXON_TEST_AUTH",
      message: "Test authentication must never be enabled in production.",
    });
  }

  if (mode === "cloud") {
    // Production sign-in is GitHub OAuth. Non-production cloud (e.g. authored
    // e2e runs) may rely on the fail-closed test-auth provider instead.
    if (
      isProduction &&
      ((env.AUTH_GITHUB_ID ?? "") === "" || (env.AUTH_GITHUB_SECRET ?? "") === "")
    ) {
      problems.push({
        variable: "AUTH_GITHUB_ID",
        message: "Cloud mode needs GitHub OAuth credentials for production sign-in.",
      });
    }
    if (env.NEXT_PUBLIC_AXON_PERSISTENCE_MODE !== "cloud") {
      problems.push({
        variable: "NEXT_PUBLIC_AXON_PERSISTENCE_MODE",
        message: 'Must be "cloud" so the browser talks to server storage.',
      });
    }

    if (isProduction) {
      // The in-process PGlite test driver must never back a public deployment.
      if (env.AXON_DB_DRIVER === "pglite") {
        problems.push({
          variable: "AXON_DB_DRIVER",
          message: "The PGlite test driver must not be used in production.",
        });
      }
      // A real, non-placeholder auth secret is required.
      if (isPlaceholderSecret(env.AUTH_SECRET)) {
        problems.push({
          variable: "AUTH_SECRET",
          message: "A strong, non-placeholder auth secret is required in production.",
        });
      }
      // A valid application URL is required (used for OAuth callbacks and
      // origin validation).
      const appUrl = env.AXON_APP_URL ?? env.AUTH_URL;
      if (!isValidHttpUrl(appUrl)) {
        problems.push({
          variable: "AXON_APP_URL",
          message: "A valid https application URL is required.",
        });
      }
      problems.push(...validateGeneration(env));
    }
  }

  // Legal/trust contact configuration must be real in production, so the
  // published Privacy/Terms pages never show placeholder company or contact
  // details. This is launch-blocking.
  if (isProduction) {
    for (const variable of REQUIRED_LEGAL_ENV) {
      if ((env[variable] ?? "").trim() === "") {
        problems.push({
          variable,
          message: "Legal/trust contact configuration is required before public launch.",
        });
      }
    }
  }

  return problems;
}

/** Known weak/placeholder auth-secret values that must never reach production. */
const PLACEHOLDER_SECRETS = new Set([
  "",
  "secret",
  "changeme",
  "change-me",
  "development",
  "dev",
  "test",
  "test-secret",
  "please-change",
]);

function isPlaceholderSecret(value: string | undefined): boolean {
  if (value === undefined) return true;
  const trimmed = value.trim();
  // Too short to be a real secret, or a known placeholder.
  return trimmed.length < 16 || PLACEHOLDER_SECRETS.has(trimmed.toLowerCase());
}

function isValidHttpUrl(value: string | undefined): boolean {
  if (value === undefined || value.trim() === "") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const KNOWN_AI_PROVIDERS = new Set(["anthropic"]);
const KNOWN_AI_MODELS = new Set([
  "claude-opus-4-8",
  "claude-sonnet-5",
  "claude-fable-5",
  "claude-haiku-4-5-20251001",
]);

/**
 * Validates the generation feature configuration. Generation is enabled unless
 * explicitly disabled. When enabled, a valid provider, model, credential, and
 * positive rate limits are required.
 */
function validateGeneration(env: NodeJS.ProcessEnv): ConfigProblem[] {
  const problems: ConfigProblem[] = [];
  const enabled = env.AXON_GENERATION_ENABLED !== "false" && env.AXON_GENERATION_MODE !== "offline";
  if (!enabled) return problems;

  // An empty or whitespace value (as shipped in .env.example) means "use the
  // default provider", not an explicit unknown one.
  const provider = (env.AXON_AI_PROVIDER?.trim() || "anthropic").toLowerCase();
  if (!KNOWN_AI_PROVIDERS.has(provider)) {
    problems.push({ variable: "AXON_AI_PROVIDER", message: `Unknown AI provider "${provider}".` });
  }
  const model = env.ANTHROPIC_MODEL;
  if (model !== undefined && model !== "" && !KNOWN_AI_MODELS.has(model)) {
    problems.push({ variable: "ANTHROPIC_MODEL", message: "Unknown AI model configured." });
  }
  if ((env.ANTHROPIC_API_KEY ?? "") === "") {
    problems.push({
      variable: "ANTHROPIC_API_KEY",
      message: "A provider credential is required when generation is enabled.",
    });
  }
  for (const variable of [
    "AXON_GENERATION_DAILY_LIMIT",
    "AXON_GENERATION_PER_MINUTE_LIMIT",
    "AXON_GENERATION_CONCURRENCY_LIMIT",
  ]) {
    const raw = env[variable];
    if (raw !== undefined && raw !== "" && !(Number.isInteger(Number(raw)) && Number(raw) > 0)) {
      problems.push({ variable, message: "Must be a positive integer." });
    }
  }
  return problems;
}

/**
 * Throws when the deployment configuration is invalid, so a misconfigured
 * production deployment fails closed at startup rather than serving in an
 * unsafe state.
 */
export function assertDeploymentConfig(env: NodeJS.ProcessEnv = process.env): void {
  const problems = validateDeploymentConfig(env);
  if (problems.length > 0) {
    const summary = problems.map((p) => `${p.variable}: ${p.message}`).join("; ");
    throw new Error(`Invalid AXON deployment configuration — ${summary}`);
  }
}
