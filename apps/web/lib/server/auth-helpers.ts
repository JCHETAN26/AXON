/**
 * Pure authentication helpers with no next-auth dependency, so they are unit
 * testable and safe to import from anywhere (including Edge middleware).
 */

/**
 * Deterministic test-auth is available only outside production and only when
 * explicitly enabled. It can never act as a hidden production bypass: callers
 * omit the provider entirely when this returns false, and it returns false
 * whenever NODE_ENV is "production", regardless of the flag.
 */
export function isTestAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.AXON_TEST_AUTH === "1";
}

/** Only same-origin, path-relative redirect targets are honoured. */
export function isSafeRedirect(target: string, baseUrl: string): boolean {
  if (target.startsWith("/") && !target.startsWith("//")) return true;
  try {
    return new URL(target).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
}
