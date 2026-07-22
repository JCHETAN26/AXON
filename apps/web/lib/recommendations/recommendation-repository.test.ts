import {
  RECOMMENDATION_STATE_SCHEMA_VERSION,
  type ProjectRecommendationState,
} from "@axon/architecture-recommendations";
import { beforeEach, describe, expect, it } from "vitest";

import { LocalStorageRecommendationRepository } from "./recommendation-repository";

const STATE: ProjectRecommendationState = {
  schemaVersion: RECOMMENDATION_STATE_SCHEMA_VERSION,
  projectId: "project-1",
  documentId: "doc-1",
  registryVersion: "1.0.0",
  applied: [
    {
      recommendationFingerprint: "rec-1",
      findingFingerprint: "find-1",
      builderId: "add-dead-letter-path",
      builderVersion: "1.0.0",
      title: "Represent a dead-letter path",
      appliedAt: "2026-04-01T00:00:00.000Z",
      documentUpdatedAtAfterApply: "2026-04-01T00:00:00.000Z",
      operationFingerprints: ["op-1"],
    },
  ],
};

describe("LocalStorageRecommendationRepository", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips applied history per project", async () => {
    const repository = new LocalStorageRecommendationRepository();
    expect(await repository.getRecommendationState("project-1")).toBeNull();
    await repository.saveRecommendationState(STATE);
    expect(await repository.getRecommendationState("project-1")).toEqual(STATE);
    expect(await repository.getRecommendationState("project-2")).toBeNull();
  });

  it("treats corrupt or outdated entries as empty", async () => {
    const repository = new LocalStorageRecommendationRepository();
    window.localStorage.setItem("axon.recommendations.v1.project-1", "{broken");
    expect(await repository.getRecommendationState("project-1")).toBeNull();

    window.localStorage.setItem(
      "axon.recommendations.v1.project-1",
      JSON.stringify({ ...STATE, schemaVersion: "0.1" }),
    );
    expect(await repository.getRecommendationState("project-1")).toBeNull();
  });

  it("refuses to persist an invalid state", async () => {
    const repository = new LocalStorageRecommendationRepository();
    await expect(
      repository.saveRecommendationState({
        ...STATE,
        applied: [{ ...STATE.applied[0], appliedAt: "whenever" }],
      } as ProjectRecommendationState),
    ).rejects.toThrow(/invalid recommendation state/);
  });

  it("deletes recommendation state", async () => {
    const repository = new LocalStorageRecommendationRepository();
    await repository.saveRecommendationState(STATE);
    await repository.deleteRecommendationState("project-1");
    expect(await repository.getRecommendationState("project-1")).toBeNull();
  });
});
