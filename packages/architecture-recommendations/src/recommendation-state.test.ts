import { describe, expect, it } from "vitest";

import {
  RECOMMENDATION_STATE_SCHEMA_VERSION,
  createEmptyRecommendationState,
  safeParseProjectRecommendationState,
  type ProjectRecommendationState,
} from "./recommendation-state";

const VALID: ProjectRecommendationState = {
  schemaVersion: RECOMMENDATION_STATE_SCHEMA_VERSION,
  projectId: "project-1",
  documentId: "doc-1",
  registryVersion: "1.0.0",
  applied: [
    {
      recommendationFingerprint: "abc123",
      findingFingerprint: "def456",
      builderId: "add-dead-letter-path",
      builderVersion: "1.0.0",
      title: "Represent a dead-letter path",
      appliedAt: "2026-01-01T00:00:00.000Z",
      documentUpdatedAtAfterApply: "2026-01-01T00:00:00.000Z",
      operationFingerprints: ["op1", "op2"],
    },
  ],
};

describe("ProjectRecommendationStateSchema", () => {
  it("accepts a valid persisted state", () => {
    expect(safeParseProjectRecommendationState(VALID).success).toBe(true);
  });

  it("accepts an empty state", () => {
    expect(
      safeParseProjectRecommendationState(createEmptyRecommendationState("p", "d", "1.0.0"))
        .success,
    ).toBe(true);
  });

  it("rejects unknown schema versions", () => {
    expect(safeParseProjectRecommendationState({ ...VALID, schemaVersion: "0.1" }).success).toBe(
      false,
    );
  });

  it("rejects non-ISO timestamps", () => {
    expect(
      safeParseProjectRecommendationState({
        ...VALID,
        applied: [{ ...VALID.applied[0], appliedAt: "yesterday" }],
      }).success,
    ).toBe(false);
  });
});
