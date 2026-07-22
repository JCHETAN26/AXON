import { createHash } from "node:crypto";

/**
 * Scans built browser artifacts for accidentally-included secrets.
 *
 * It reports only safe fingerprints (a short hash) and variable names — never
 * the secret value itself. It distinguishes the public GitHub client id (safe)
 * from the client secret (must not ship). Static scanning has limits: it cannot
 * catch a secret that was transformed or split, and it may miss novel formats.
 */

export interface SecretFinding {
  readonly source: string;
  readonly file: string;
  /** Short non-reversible fingerprint of the matched value. */
  readonly fingerprint: string;
}

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

/** Env var names whose *values* must never appear in a browser bundle. */
export const SERVER_ONLY_SECRET_ENV = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_GITHUB_SECRET",
  "ANTHROPIC_API_KEY",
] as const;

// Public/allowed values that are expected in the client bundle.
const PUBLIC_ENV = ["AUTH_GITHUB_ID", "NEXT_PUBLIC_AXON_PERSISTENCE_MODE"];

/** Format-based patterns for common secret shapes (value never reported). */
const SECRET_PATTERNS: readonly { source: string; pattern: RegExp }[] = [
  { source: "anthropic-api-key", pattern: /sk-ant-[A-Za-z0-9_-]{16,}/g },
  { source: "github-oauth-secret", pattern: /gh[opsu]_[A-Za-z0-9]{30,}/g },
  { source: "postgres-url", pattern: /postgres(ql)?:\/\/[^\s"']+:[^\s"'@]+@/g },
];

/**
 * Scans one file's text for known secret values (from `env`) and secret-shaped
 * patterns. Values present in `PUBLIC_ENV` are ignored.
 */
export function scanTextForSecrets(
  file: string,
  text: string,
  env: NodeJS.ProcessEnv,
): SecretFinding[] {
  const findings: SecretFinding[] = [];

  const publicValues = new Set(
    PUBLIC_ENV.map((name) => env[name]).filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    ),
  );

  for (const name of SERVER_ONLY_SECRET_ENV) {
    const value = env[name];
    if (typeof value !== "string" || value.length < 8) continue;
    if (publicValues.has(value)) continue;
    if (text.includes(value)) {
      findings.push({ source: name, file, fingerprint: fingerprint(value) });
    }
  }

  for (const { source, pattern } of SECRET_PATTERNS) {
    const matches = text.match(pattern);
    if (matches !== null) {
      for (const match of matches) {
        if (publicValues.has(match)) continue;
        findings.push({ source, file, fingerprint: fingerprint(match) });
      }
    }
  }

  return findings;
}
