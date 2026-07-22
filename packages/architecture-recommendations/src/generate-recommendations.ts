import { type AuditFinding } from "@axon/architecture-audit";
import { buildGraphIndex, type ArchitectureDocument } from "@axon/diagram-schema";

import { computeOperationFingerprint, computeRecommendationFingerprint } from "./fingerprint";
import { describeOperation } from "./describe-operation";
import { operationElementIds, type FingerprintedOperation } from "./patch";
import { DEFAULT_REGISTRY } from "./registry";
import { type Recommendation, type RecommendationBuilder } from "./types";

export interface GenerateRecommendationsInput {
  readonly document: ArchitectureDocument;
  /**
   * Persisted audit findings. A recommendation can only originate here —
   * there is no path that produces one without a finding behind it.
   */
  readonly findings: readonly AuditFinding[];
  readonly registry?: ReadonlyMap<string, RecommendationBuilder>;
}

/**
 * Pure, deterministic generation. The same document, findings, and registry
 * always produce the same recommendations in the same order. No model calls,
 * no network, no clock.
 *
 * Resolved findings produce nothing: there is no change left to propose.
 */
export function generateRecommendations({
  document,
  findings,
  registry = DEFAULT_REGISTRY,
}: GenerateRecommendationsInput): Recommendation[] {
  const index = buildGraphIndex(document);
  const recommendations: Recommendation[] = [];

  for (const finding of findings) {
    if (finding.state === "resolved") continue;
    const builder = registry.get(finding.ruleId);
    if (builder === undefined) continue;

    const draft = builder.build({ document, index, finding });
    if (draft === null) continue;

    const fingerprint = computeRecommendationFingerprint(builder.id, finding.fingerprint);
    const operations: FingerprintedOperation[] = draft.operations.map((operation) => ({
      fingerprint: computeOperationFingerprint(fingerprint, operation),
      operation,
      description: describeOperation(operation, document),
    }));

    const elementIds = [...new Set(draft.operations.flatMap(operationElementIds))].sort();

    recommendations.push({
      fingerprint,
      findingFingerprint: finding.fingerprint,
      ruleId: finding.ruleId,
      builderId: builder.id,
      builderVersion: builder.version,
      title: draft.title,
      proposedChange: draft.proposedChange,
      rationale: draft.rationale,
      expectedEffect: draft.expectedEffect,
      assumptions: draft.assumptions,
      mode: draft.mode,
      // Manual-review recommendations still name the elements under review.
      elementIds: elementIds.length > 0 ? elementIds : [...finding.elementIds].sort(),
      operations,
    });
  }

  // Automatic changes first, then by title, then fingerprint — stable across
  // runs regardless of the order findings arrive in.
  return recommendations.sort((a, b) => {
    if (a.mode !== b.mode) return a.mode === "automatic" ? -1 : 1;
    if (a.title !== b.title) return a.title < b.title ? -1 : 1;
    return a.fingerprint < b.fingerprint ? -1 : 1;
  });
}
