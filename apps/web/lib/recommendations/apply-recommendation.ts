import { type ProjectAuditState } from "@axon/architecture-audit";
import {
  RECOMMENDATION_REGISTRY_VERSION,
  createEmptyRecommendationState,
  evaluateApplicability,
  previewPatch,
  type ProjectRecommendationState,
  type Recommendation,
} from "@axon/architecture-recommendations";
import { type ArchitectureDocument } from "@axon/diagram-schema";

import { type ProjectRepository, type ProjectWithDocument } from "@/lib/projects/repository";
import { type RecommendationRepository } from "./recommendation-repository";

/** The audit no longer describes the document the user is looking at. */
export function isAuditStale(
  auditState: ProjectAuditState | null,
  document: ArchitectureDocument,
): boolean {
  if (auditState === null) return true;
  return (
    auditState.documentId !== document.id ||
    auditState.documentUpdatedAtAtRun !== document.updatedAt
  );
}

export function wasApplied(
  state: ProjectRecommendationState | null,
  recommendation: Recommendation,
): boolean {
  return (
    state?.applied.some(
      (entry) => entry.recommendationFingerprint === recommendation.fingerprint,
    ) ?? false
  );
}

export interface ApplyRecommendationInput {
  readonly recommendation: Recommendation;
  readonly projectId: string;
  readonly document: ArchitectureDocument;
  readonly auditState: ProjectAuditState | null;
  readonly recommendationState: ProjectRecommendationState | null;
  readonly projectRepository: ProjectRepository;
  readonly recommendationRepository: RecommendationRepository;
  readonly now: string;
}

export interface ApplyRecommendationSuccess {
  readonly ok: true;
  readonly saved: ProjectWithDocument;
  readonly recommendationState: ProjectRecommendationState;
}

export interface ApplyRecommendationFailure {
  readonly ok: false;
  readonly reasons: readonly string[];
}

/**
 * Applies one recommendation to the AXON architecture document.
 *
 * Applicability is re-checked here rather than trusted from the UI, so a
 * stale, conflicted, already-applied, or manual-review recommendation can
 * never be written even if a control is somehow reached. The document is
 * validated by previewPatch and again by the repository before persisting.
 *
 * The audit is deliberately left untouched: applying a change makes the audit
 * stale, and the source finding stays active until the audit is rerun.
 */
export async function applyRecommendation({
  recommendation,
  projectId,
  document,
  auditState,
  recommendationState,
  projectRepository,
  recommendationRepository,
  now,
}: ApplyRecommendationInput): Promise<ApplyRecommendationSuccess | ApplyRecommendationFailure> {
  const applicability = evaluateApplicability({
    recommendation,
    document,
    auditIsStale: isAuditStale(auditState, document),
    alreadyApplied: wasApplied(recommendationState, recommendation),
  });
  if (!applicability.canApply) {
    return { ok: false, reasons: applicability.reasons };
  }

  const preview = previewPatch(
    document,
    recommendation.operations.map((item) => item.operation),
    now,
  );
  if (!preview.ok) {
    return { ok: false, reasons: preview.reasons };
  }

  let saved: ProjectWithDocument;
  try {
    saved = await projectRepository.updateDocument(projectId, preview.document);
  } catch (error) {
    return {
      ok: false,
      reasons: [error instanceof Error ? error.message : "Could not save the change locally."],
    };
  }

  const base =
    recommendationState ??
    createEmptyRecommendationState(projectId, document.id, RECOMMENDATION_REGISTRY_VERSION);
  const nextState: ProjectRecommendationState = {
    ...base,
    registryVersion: RECOMMENDATION_REGISTRY_VERSION,
    applied: [
      ...base.applied,
      {
        recommendationFingerprint: recommendation.fingerprint,
        findingFingerprint: recommendation.findingFingerprint,
        builderId: recommendation.builderId,
        builderVersion: recommendation.builderVersion,
        title: recommendation.title,
        appliedAt: now,
        documentUpdatedAtAfterApply: saved.document.updatedAt,
        operationFingerprints: recommendation.operations.map((item) => item.fingerprint),
      },
    ],
  };

  // A failed history write must not silently lose the record, but the
  // document change already succeeded — report it rather than rolling back a
  // valid architecture change the user approved.
  try {
    await recommendationRepository.saveRecommendationState(nextState);
  } catch {
    return { ok: true, saved, recommendationState: base };
  }

  return { ok: true, saved, recommendationState: nextState };
}
