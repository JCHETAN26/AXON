/**
 * Safety guard for the PostgreSQL verification tooling. The verification writes
 * and deletes records, so it must never run by accident or against production.
 */

export type VerificationGuard = { ok: true; databaseUrl: string } | { ok: false; reason: string };

/**
 * Verification is allowed only when:
 * - `AXON_VERIFICATION_MODE=staging` is set explicitly, and
 * - a `DATABASE_URL` is present, and
 * - the target is not production unless an explicit destructive-confirmation
 *   flag is also set.
 */
export function assertVerificationAllowed(env: NodeJS.ProcessEnv): VerificationGuard {
  if (env.AXON_VERIFICATION_MODE !== "staging") {
    return {
      ok: false,
      reason: 'Refusing to run: set AXON_VERIFICATION_MODE="staging" to enable verification.',
    };
  }
  const databaseUrl = env.DATABASE_URL;
  if (databaseUrl === undefined || databaseUrl.trim() === "") {
    return { ok: false, reason: "Refusing to run: DATABASE_URL is not set." };
  }
  const looksProduction =
    env.NODE_ENV === "production" ||
    /prod|production/i.test(databaseUrl) ||
    env.AXON_PERSISTENCE_MODE === "cloud";
  if (looksProduction && env.AXON_VERIFICATION_ALLOW_DESTRUCTIVE !== "yes-i-understand") {
    return {
      ok: false,
      reason:
        "Refusing to run against a production-like target without AXON_VERIFICATION_ALLOW_DESTRUCTIVE=yes-i-understand.",
    };
  }
  return { ok: true, databaseUrl };
}

/** A unique prefix for every record the verification creates, so cleanup is safe. */
export function verificationPrefix(now: Date = new Date()): string {
  return `axon-verify-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
}
