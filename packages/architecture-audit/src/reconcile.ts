import { type AuditFinding } from "./audit-state";
import { compareFindingOrder } from "./sort";
import { type FindingCandidate } from "./types";

/** Content fields copied from the latest candidate on every reconciliation. */
function toFindingContent(candidate: FindingCandidate) {
  return {
    fingerprint: candidate.fingerprint,
    ruleId: candidate.ruleId,
    ruleVersion: candidate.ruleVersion,
    severity: candidate.severity,
    title: candidate.title,
    detected: candidate.detected,
    elementIds: [...candidate.elementIds],
    evidence: candidate.evidence.map((item) => ({
      text: item.text,
      elementIds: [...item.elementIds],
    })),
    inference: candidate.inference,
    limitation: candidate.limitation,
    recommendation: candidate.recommendation,
  };
}

export interface ReconcileInput {
  readonly previous: readonly AuditFinding[];
  readonly candidates: readonly FindingCandidate[];
  /** ISO timestamp supplied by the caller so reconciliation stays pure. */
  readonly now: string;
}

/**
 * Merges a fresh run into the persisted findings:
 * - new fingerprint            → open
 * - matched, previously open   → stays open (firstDetectedAt preserved)
 * - matched, acknowledged      → stays acknowledged (acknowledgement carried)
 * - matched, previously resolved → reopened as open
 * - unmatched open/acknowledged  → auto-resolved
 * - unmatched resolved           → kept as history
 */
export function reconcileFindings({ previous, candidates, now }: ReconcileInput): AuditFinding[] {
  const previousByFingerprint = new Map(previous.map((finding) => [finding.fingerprint, finding]));
  const matched = new Set<string>();
  const next: AuditFinding[] = [];

  for (const candidate of candidates) {
    matched.add(candidate.fingerprint);
    const before = previousByFingerprint.get(candidate.fingerprint);

    if (before === undefined) {
      next.push({
        ...toFindingContent(candidate),
        state: "open",
        firstDetectedAt: now,
        lastSeenAt: now,
      });
      continue;
    }

    if (before.state === "acknowledged") {
      next.push({
        ...toFindingContent(candidate),
        state: "acknowledged",
        firstDetectedAt: before.firstDetectedAt,
        lastSeenAt: now,
        ...(before.acknowledgedAt !== undefined && { acknowledgedAt: before.acknowledgedAt }),
      });
      continue;
    }

    // Previously open stays open; previously resolved reopens as open with
    // its state timestamps cleared — it is a fresh occurrence of a known risk.
    next.push({
      ...toFindingContent(candidate),
      state: "open",
      firstDetectedAt: before.firstDetectedAt,
      lastSeenAt: now,
    });
  }

  for (const before of previous) {
    if (matched.has(before.fingerprint)) continue;
    if (before.state === "resolved") {
      next.push(before);
      continue;
    }
    next.push({ ...before, state: "resolved", resolvedAt: now });
  }

  return next.sort(compareFindingOrder);
}

/**
 * Manual state changes. Only open ↔ acknowledged transitions are user-driven;
 * resolution happens exclusively through reconciliation, so a finding can
 * never be hand-marked as fixed. Returns the input array untouched when the
 * transition is a no-op or not allowed.
 */
export function setFindingState(
  findings: readonly AuditFinding[],
  fingerprint: string,
  nextState: "open" | "acknowledged",
  now: string,
): readonly AuditFinding[] {
  let changed = false;

  const next = findings.map((finding): AuditFinding => {
    if (finding.fingerprint !== fingerprint || finding.state === nextState) return finding;
    if (finding.state === "resolved") return finding;

    changed = true;
    if (nextState === "acknowledged") {
      return { ...finding, state: "acknowledged", acknowledgedAt: now };
    }
    const reopened: AuditFinding = { ...finding, state: "open" };
    delete reopened.acknowledgedAt;
    delete reopened.resolvedAt;
    return reopened;
  });

  return changed ? next : findings;
}
