/**
 * Named safety limits. Pathological input is rejected against these rather
 * than being parsed unboundedly — a Compose document is untrusted text.
 */
export const IMPORT_LIMITS = {
  /** Maximum raw document size, in bytes (1 MB). */
  maxBytes: 1_000_000,
  /** Maximum nesting depth of the parsed structure. */
  maxDepth: 40,
  /** Maximum length of any single imported scalar string. */
  maxScalarLength: 4_000,
  /** Caps on collection sizes. */
  maxServices: 100,
  maxNetworks: 100,
  maxVolumes: 100,
  maxConfigs: 100,
  maxSecrets: 100,
  maxDependencies: 500,
  /**
   * Alias-expansion cap passed to the YAML parser to defuse "billion laughs"
   * style bombs before they can expand in memory.
   */
  maxAliasCount: 100,
} as const;

export type ImportLimits = typeof IMPORT_LIMITS;
