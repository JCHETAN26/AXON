import { AUDIT_STATE_SCHEMA_VERSION, type ProjectAuditState } from "@axon/architecture-audit";
import { generateRecommendations, type Recommendation } from "@axon/architecture-recommendations";
import { beforeEach, describe, expect, it } from "vitest";

import { applyRecommendation, isAuditStale, wasApplied } from "./apply-recommendation";
import { LocalStorageRecommendationRepository } from "./recommendation-repository";
import { computeNextAuditState } from "@/lib/audit/run-project-audit";
import { LocalStorageProjectRepository } from "@/lib/projects/local-storage-repository";

const NOW = "2026-04-01T00:00:00.000Z";
const LATER = "2026-04-02T00:00:00.000Z";

async function setupProject() {
  const projectRepository = new LocalStorageProjectRepository();
  const recommendationRepository = new LocalStorageRecommendationRepository();
  const created = await projectRepository.createProject({
    name: "Recommend me",
    template: "sample",
  });
  const auditState = computeNextAuditState({
    document: created.document,
    previous: null,
    now: NOW,
  });
  const recommendations = generateRecommendations({
    document: created.document,
    findings: auditState.findings,
  });
  return { projectRepository, recommendationRepository, created, auditState, recommendations };
}

function byBuilder(recommendations: readonly Recommendation[], builderId: string): Recommendation {
  const found = recommendations.find((item) => item.builderId === builderId);
  if (found === undefined) throw new Error(`missing ${builderId}`);
  return found;
}

describe("isAuditStale", () => {
  it("treats a missing audit as stale", async () => {
    const { created } = await setupProject();
    expect(isAuditStale(null, created.document)).toBe(true);
  });

  it("is fresh when the run matches the document", async () => {
    const { created, auditState } = await setupProject();
    expect(isAuditStale(auditState, created.document)).toBe(false);
  });

  it("is stale once the document is edited", async () => {
    const { created, auditState } = await setupProject();
    expect(isAuditStale(auditState, { ...created.document, updatedAt: LATER })).toBe(true);
  });
});

describe("applyRecommendation", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("applies a dead-letter patch and records it", async () => {
    const { projectRepository, recommendationRepository, created, auditState, recommendations } =
      await setupProject();
    const recommendation = byBuilder(recommendations, "add-dead-letter-path");

    const result = await applyRecommendation({
      recommendation,
      projectId: created.project.id,
      document: created.document,
      auditState,
      recommendationState: null,
      projectRepository,
      recommendationRepository,
      now: LATER,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.saved.document.nodes.some((node) => node.id === "rabbitmq-dead-letter")).toBe(
      true,
    );
    expect(result.recommendationState.applied).toHaveLength(1);

    // Persisted, and readable back.
    const stored = await recommendationRepository.getRecommendationState(created.project.id);
    expect(stored?.applied[0]?.recommendationFingerprint).toBe(recommendation.fingerprint);
  });

  it("preserves document identity and generation metadata", async () => {
    const { projectRepository, recommendationRepository, created, auditState, recommendations } =
      await setupProject();
    const result = await applyRecommendation({
      recommendation: byBuilder(recommendations, "add-dead-letter-path"),
      projectId: created.project.id,
      document: created.document,
      auditState,
      recommendationState: null,
      projectRepository,
      recommendationRepository,
      now: LATER,
    });
    if (!result.ok) throw new Error("expected success");

    expect(result.saved.document.id).toBe(created.document.id);
    expect(result.saved.document.projectId).toBe(created.document.projectId);
    expect(result.saved.document.createdAt).toBe(created.document.createdAt);
    expect(result.saved.document.source).toEqual(created.document.source);
    expect(result.saved.document.assumptions).toEqual(created.document.assumptions);
    expect(result.saved.document.metadata).toEqual(created.document.metadata);
  });

  it("leaves the audit untouched so the finding stays active until a rerun", async () => {
    const { projectRepository, recommendationRepository, created, auditState, recommendations } =
      await setupProject();
    const recommendation = byBuilder(recommendations, "add-dead-letter-path");

    const result = await applyRecommendation({
      recommendation,
      projectId: created.project.id,
      document: created.document,
      auditState,
      recommendationState: null,
      projectRepository,
      recommendationRepository,
      now: LATER,
    });
    if (!result.ok) throw new Error("expected success");

    // The finding is still open...
    const finding = auditState.findings.find(
      (item) => item.fingerprint === recommendation.findingFingerprint,
    );
    expect(finding?.state).toBe("open");
    // ...and the audit is now stale against the updated document.
    expect(isAuditStale(auditState, result.saved.document)).toBe(true);

    // Only a rerun resolves it.
    const rerun = computeNextAuditState({
      document: result.saved.document,
      previous: auditState,
      now: LATER,
    });
    expect(
      rerun.findings.find((item) => item.fingerprint === recommendation.findingFingerprint)?.state,
    ).toBe("resolved");
  });

  it("refuses to apply the same recommendation twice", async () => {
    const { projectRepository, recommendationRepository, created, auditState, recommendations } =
      await setupProject();
    const recommendation = byBuilder(recommendations, "add-dead-letter-path");
    const first = await applyRecommendation({
      recommendation,
      projectId: created.project.id,
      document: created.document,
      auditState,
      recommendationState: null,
      projectRepository,
      recommendationRepository,
      now: LATER,
    });
    if (!first.ok) throw new Error("expected success");

    // Second attempt against the updated document, with a fresh audit so the
    // only blocker is idempotency.
    const freshAudit = computeNextAuditState({
      document: first.saved.document,
      previous: auditState,
      now: LATER,
    });
    const second = await applyRecommendation({
      recommendation,
      projectId: created.project.id,
      document: first.saved.document,
      auditState: freshAudit,
      recommendationState: first.recommendationState,
      projectRepository,
      recommendationRepository,
      now: LATER,
    });

    expect(second.ok).toBe(false);
    expect(
      first.saved.document.nodes.filter((node) => node.id === "rabbitmq-dead-letter"),
    ).toHaveLength(1);
  });

  it("refuses to apply against a stale audit", async () => {
    const { projectRepository, recommendationRepository, created, auditState, recommendations } =
      await setupProject();
    const staleDocument = { ...created.document, updatedAt: LATER };

    const result = await applyRecommendation({
      recommendation: byBuilder(recommendations, "add-dead-letter-path"),
      projectId: created.project.id,
      document: staleDocument,
      auditState,
      recommendationState: null,
      projectRepository,
      recommendationRepository,
      now: LATER,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasons[0]).toContain("Rerun the audit");
  });

  it("refuses to apply a manual-review recommendation", async () => {
    const { projectRepository, recommendationRepository, created, auditState, recommendations } =
      await setupProject();
    const result = await applyRecommendation({
      recommendation: byBuilder(recommendations, "review-single-point-of-failure"),
      projectId: created.project.id,
      document: created.document,
      auditState,
      recommendationState: null,
      projectRepository,
      recommendationRepository,
      now: LATER,
    });
    expect(result.ok).toBe(false);
  });
});

describe("wasApplied", () => {
  it("recognises a persisted application", async () => {
    const { recommendations } = await setupProject();
    const recommendation = byBuilder(recommendations, "add-dead-letter-path");
    expect(wasApplied(null, recommendation)).toBe(false);
    expect(
      wasApplied(
        {
          schemaVersion: "1.0",
          projectId: "p",
          documentId: "d",
          registryVersion: "1.0.0",
          applied: [
            {
              recommendationFingerprint: recommendation.fingerprint,
              findingFingerprint: recommendation.findingFingerprint,
              builderId: recommendation.builderId,
              builderVersion: recommendation.builderVersion,
              title: recommendation.title,
              appliedAt: NOW,
              documentUpdatedAtAfterApply: NOW,
              operationFingerprints: [],
            },
          ],
        },
        recommendation,
      ),
    ).toBe(true);
  });
});

describe("audit state fixture", () => {
  it("uses the canonical persisted shape", async () => {
    const { auditState } = await setupProject();
    const typed: ProjectAuditState = auditState;
    expect(typed.schemaVersion).toBe(AUDIT_STATE_SCHEMA_VERSION);
  });
});
