/**
 * Explicit, validated persistence configuration.
 *
 * The product runs in one of two modes:
 * - "local": browser-local persistence, no auth (frictionless development).
 * - "cloud": server persistence behind authentication and beta gating.
 *
 * A production deployment must never silently fall back to anonymous/local
 * behavior because database configuration happens to be absent. The mode is
 * therefore chosen explicitly via `AXON_PERSISTENCE_MODE`, and cloud mode
 * fails closed if its required configuration is incomplete.
 */

export type PersistenceMode = "local" | "cloud";

export class PersistenceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersistenceConfigError";
  }
}

type EnvLike = Record<string, string | undefined>;

function present(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}

/**
 * Resolves and validates the persistence mode, throwing
 * {@link PersistenceConfigError} on any misconfiguration:
 *
 * - unset in production            → error (must be explicit; no silent local)
 * - unset outside production       → "local"
 * - an unrecognised value          → error
 * - "cloud" without DATABASE_URL / AUTH_SECRET → error (fail closed)
 */
export function resolvePersistenceMode(env: EnvLike = process.env): PersistenceMode {
  const raw = env["AXON_PERSISTENCE_MODE"]?.trim().toLowerCase();
  const isProduction = env["NODE_ENV"] === "production";

  if (raw === undefined || raw === "") {
    if (isProduction) {
      throw new PersistenceConfigError(
        'AXON_PERSISTENCE_MODE must be set to "local" or "cloud" in production; ' +
          "refusing to start with an implicit persistence mode.",
      );
    }
    return "local";
  }

  if (raw !== "local" && raw !== "cloud") {
    throw new PersistenceConfigError(
      `AXON_PERSISTENCE_MODE must be "local" or "cloud"; received "${raw}".`,
    );
  }

  if (raw === "cloud") {
    const missing: string[] = [];
    // A database is required — either a PostgreSQL URL or the in-process PGlite
    // driver used for self-contained authenticated testing.
    const hasDatabase = present(env["DATABASE_URL"]) || env["AXON_DB_DRIVER"] === "pglite";
    if (!hasDatabase) missing.push("DATABASE_URL");
    if (!present(env["AUTH_SECRET"])) missing.push("AUTH_SECRET");
    if (missing.length > 0) {
      throw new PersistenceConfigError(
        `Cloud persistence requires ${missing.join(" and ")} to be set.`,
      );
    }
  }

  return raw;
}

export function isCloudMode(env: EnvLike = process.env): boolean {
  return resolvePersistenceMode(env) === "cloud";
}
