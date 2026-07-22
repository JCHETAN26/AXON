/**
 * 32-bit FNV-1a. Chosen for determinism, stability across runtimes, and zero
 * dependencies — the fingerprint is an identity key for reconciliation, not
 * a security primitive.
 */
export function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function computeFingerprint(ruleId: string, fingerprintKey: string): string {
  return fnv1aHex(`${ruleId}|${fingerprintKey}`);
}

/** Fallback identity when a rule does not pin its own fingerprint key. */
export function defaultFingerprintKey(elementIds: readonly string[]): string {
  return [...elementIds].sort().join(",");
}
