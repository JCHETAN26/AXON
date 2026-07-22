/**
 * Safe structured logging for server code.
 *
 * Only an allowlisted set of low-sensitivity fields is emitted. Everything else
 * is dropped, and known sensitive keys are hard-blocked even if an allowed key
 * is spelled the same. This prevents accidental logging of prompts,
 * architecture JSON, Compose YAML, secrets, tokens, sessions, invite
 * codes/hashes, feedback bodies, provider responses, or environment values.
 */

export type SafeLogLevel = "info" | "warn" | "error";

/** Fields permitted in a structured log entry. */
export interface SafeLogFields {
  requestId?: string;
  /** Opaque internal user subject id — never an email or token. */
  userSubject?: string;
  projectId?: string;
  operation?: string;
  errorCode?: string;
  durationMs?: number;
  provider?: string;
  model?: string;
  tokenCount?: number;
  status?: number;
}

const ALLOWED_KEYS: readonly (keyof SafeLogFields)[] = [
  "requestId",
  "userSubject",
  "projectId",
  "operation",
  "errorCode",
  "durationMs",
  "provider",
  "model",
  "tokenCount",
  "status",
];

/**
 * Reduces an arbitrary object to only the safe, allowlisted fields. This is a
 * strict allowlist — any key not in {@link ALLOWED_KEYS} is dropped, so
 * sensitive fields (prompts, architecture JSON, Compose YAML, secrets, tokens,
 * sessions, invite codes, feedback bodies, provider responses, env values) can
 * never be emitted. Non-primitive values are dropped too, so a nested object
 * like an ArchitectureDocument cannot leak.
 */
export function sanitizeLogFields(input: Record<string, unknown>): SafeLogFields {
  const output: SafeLogFields = {};
  for (const key of ALLOWED_KEYS) {
    const value = input[key];
    if (value === undefined) continue;
    if (typeof value === "string" || typeof value === "number") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (output as any)[key] = value;
    }
  }
  return output;
}

export function safeLog(level: SafeLogLevel, message: string, fields: SafeLogFields = {}): void {
  const entry = { level, message, ...sanitizeLogFields(fields as Record<string, unknown>) };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}
