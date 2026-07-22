import { fnv1aHex } from "@axon/architecture-audit";

import { type PatchOperation } from "./patch";

/**
 * Deterministic JSON with sorted keys, so an operation's fingerprint depends
 * on its content rather than on key insertion order.
 */
export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalStringify(item)}`)
    .join(",")}}`;
}

/**
 * A recommendation's identity is its builder plus the finding that triggered
 * it — stable across audit reruns, so an applied recommendation stays
 * recognisable even as finding text changes.
 */
export function computeRecommendationFingerprint(
  builderId: string,
  findingFingerprint: string,
): string {
  return fnv1aHex(`${builderId}|${findingFingerprint}`);
}

/** An operation's identity is its content within its recommendation. */
export function computeOperationFingerprint(
  recommendationFingerprint: string,
  operation: PatchOperation,
): string {
  return fnv1aHex(`${recommendationFingerprint}|${canonicalStringify(operation)}`);
}
