export type ClientPersistenceMode = "local" | "cloud";

/**
 * The persistence mode as seen by client code. Published as a build-time
 * public variable because it is not a secret — it only decides which
 * repository the browser talks to. It is never a security boundary: the server
 * API routes independently enforce authentication and owner-scoping, so a
 * mislabelled client can at worst pick the wrong store, never bypass a gate.
 *
 * Defaults to "local" unless explicitly set to "cloud", so a missing value can
 * never silently route product data somewhere unauthenticated.
 */
export function clientPersistenceMode(): ClientPersistenceMode {
  return process.env.NEXT_PUBLIC_AXON_PERSISTENCE_MODE === "cloud" ? "cloud" : "local";
}

export function isClientCloudMode(): boolean {
  return clientPersistenceMode() === "cloud";
}
