import { computeFingerprint, defaultFingerprintKey } from "./fingerprint";
import { DEFAULT_RULESET, type AuditRuleset } from "./ruleset";
import { compareFindingOrder } from "./sort";
import { type FindingCandidate, type RuleContext } from "./types";

import { buildGraphIndex, type ArchitectureDocument } from "@axon/diagram-schema";

/**
 * Pure, deterministic audit run. The same document, ruleset version, and rule
 * configuration always produce the same candidates in the same order. No
 * network access, no model calls, no clock reads.
 */
export function runAudit(
  document: ArchitectureDocument,
  ruleset: AuditRuleset = DEFAULT_RULESET,
): FindingCandidate[] {
  const context: RuleContext = { document, index: buildGraphIndex(document) };
  const candidates: FindingCandidate[] = [];
  const seenFingerprints = new Set<string>();

  const rules = [...ruleset.rules].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const rule of rules) {
    for (const draft of rule.evaluate(context)) {
      const key = draft.fingerprintKey ?? defaultFingerprintKey(draft.elementIds);
      const fingerprint = computeFingerprint(rule.id, key);
      if (seenFingerprints.has(fingerprint)) {
        throw new Error(`Rule "${rule.id}" produced a duplicate fingerprint: ${fingerprint}`);
      }
      seenFingerprints.add(fingerprint);
      candidates.push({
        ruleId: rule.id,
        ruleVersion: rule.version,
        fingerprint,
        severity: draft.severity,
        title: draft.title,
        detected: draft.detected,
        elementIds: draft.elementIds,
        evidence: draft.evidence,
        inference: draft.inference,
        limitation: draft.limitation,
        recommendation: draft.recommendation,
      });
    }
  }

  return candidates.sort(compareFindingOrder);
}
