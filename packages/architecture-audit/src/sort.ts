import { type FindingSeverity } from "./types";

export const SEVERITY_RANK: Record<FindingSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
  info: 3,
};

interface FindingOrderKey {
  readonly severity: FindingSeverity;
  readonly ruleId: string;
  readonly fingerprint: string;
}

/** Locale-independent so ordering is identical on every machine. */
function compareStrings(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function compareFindingOrder(a: FindingOrderKey, b: FindingOrderKey): number {
  const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (bySeverity !== 0) return bySeverity;
  const byRule = compareStrings(a.ruleId, b.ruleId);
  if (byRule !== 0) return byRule;
  return compareStrings(a.fingerprint, b.fingerprint);
}
