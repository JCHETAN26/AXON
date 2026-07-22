import { z } from "zod";

/**
 * Persisted recommendation model. Recommendations themselves are recomputed
 * deterministically from findings, so only the *applied history* is stored —
 * enough to show what was applied and to keep application idempotent across
 * reloads.
 */

export const RECOMMENDATION_STATE_SCHEMA_VERSION = "1.0";

const nonEmptyString = z.string().min(1);
const isoDateTime = z.iso.datetime();

export const AppliedRecommendationSchema = z.object({
  recommendationFingerprint: nonEmptyString,
  findingFingerprint: nonEmptyString,
  builderId: nonEmptyString,
  builderVersion: nonEmptyString,
  title: nonEmptyString,
  appliedAt: isoDateTime,
  /** document.updatedAt produced by the application. */
  documentUpdatedAtAfterApply: isoDateTime,
  operationFingerprints: z.array(nonEmptyString),
});

export const ProjectRecommendationStateSchema = z.object({
  schemaVersion: z.literal(RECOMMENDATION_STATE_SCHEMA_VERSION),
  projectId: nonEmptyString,
  documentId: nonEmptyString,
  registryVersion: nonEmptyString,
  applied: z.array(AppliedRecommendationSchema),
});

export type AppliedRecommendation = z.infer<typeof AppliedRecommendationSchema>;
export type ProjectRecommendationState = z.infer<typeof ProjectRecommendationStateSchema>;

export function parseProjectRecommendationState(input: unknown): ProjectRecommendationState {
  return ProjectRecommendationStateSchema.parse(input);
}

export function safeParseProjectRecommendationState(input: unknown) {
  return ProjectRecommendationStateSchema.safeParse(input);
}

export function createEmptyRecommendationState(
  projectId: string,
  documentId: string,
  registryVersion: string,
): ProjectRecommendationState {
  return {
    schemaVersion: RECOMMENDATION_STATE_SCHEMA_VERSION,
    projectId,
    documentId,
    registryVersion,
    applied: [],
  };
}
