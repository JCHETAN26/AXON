import { type AuditFinding } from "@axon/architecture-audit";
import { type ArchitectureDocument, type GraphIndex } from "@axon/diagram-schema";

import { type FingerprintedOperation, type PatchOperation } from "./patch";

/**
 * Whether AXON is willing to apply a change automatically. "manual-review"
 * means the decision needs an engineer — those recommendations carry no
 * operations and must never expose an enabled apply action.
 */
export type RecommendationMode = "automatic" | "manual-review";

export interface RecommendationDraft {
  readonly title: string;
  /** What change is proposed. */
  readonly proposedChange: string;
  /** Why it is proposed. */
  readonly rationale: string;
  /** What effect is expected on the architecture model. */
  readonly expectedEffect: string;
  /** What assumptions or limitations apply. */
  readonly assumptions: readonly string[];
  readonly mode: RecommendationMode;
  /** Empty for manual-review recommendations. */
  readonly operations: readonly PatchOperation[];
}

export interface BuilderContext {
  readonly document: ArchitectureDocument;
  readonly index: GraphIndex;
  readonly finding: AuditFinding;
}

export interface RecommendationBuilder {
  readonly id: string;
  readonly version: string;
  /** Audit rule this builder responds to. */
  readonly ruleId: string;
  build(context: BuilderContext): RecommendationDraft | null;
}

/** A draft with engine-assigned identity — the deterministic unit of work. */
export interface Recommendation {
  readonly fingerprint: string;
  readonly findingFingerprint: string;
  readonly ruleId: string;
  readonly builderId: string;
  readonly builderVersion: string;
  readonly title: string;
  readonly proposedChange: string;
  readonly rationale: string;
  readonly expectedEffect: string;
  readonly assumptions: readonly string[];
  readonly mode: RecommendationMode;
  /** Architecture elements the patch will touch, sorted. */
  readonly elementIds: readonly string[];
  readonly operations: readonly FingerprintedOperation[];
}

export type ApplicabilityStatus =
  "ready" | "already-applied" | "stale" | "conflicted" | "manual-review";

export interface Applicability {
  readonly status: ApplicabilityStatus;
  /** Human-readable explanation; always populated for non-ready statuses. */
  readonly reasons: readonly string[];
  /** True only when AXON can safely preview and apply the change. */
  readonly canApply: boolean;
}
