export { isOperationSatisfied, previewPatch, type PreviewResult } from "./apply-patch";
export { evaluateApplicability, type ApplicabilityInput } from "./applicability";
export { deadLetterPathBuilder } from "./builders/dead-letter-path";
export { isolatedComponentBuilder } from "./builders/isolated-component";
export { plannedDependencyBuilder } from "./builders/planned-dependency";
export { singlePointOfFailureBuilder } from "./builders/single-point-of-failure";
export { telemetryCoverageBuilder } from "./builders/telemetry-coverage";
export { describeOperation } from "./describe-operation";
export {
  computeDocumentDiff,
  type DiffState,
  type DocumentDiff,
  type EdgeDiff,
  type NodeDiff,
} from "./diff";
export {
  canonicalStringify,
  computeOperationFingerprint,
  computeRecommendationFingerprint,
} from "./fingerprint";
export {
  generateRecommendations,
  type GenerateRecommendationsInput,
} from "./generate-recommendations";
export {
  PatchEdgeSchema,
  PatchNodeChangesSchema,
  PatchNodeSchema,
  PatchOperationSchema,
  operationElementIds,
  type FingerprintedOperation,
  type PatchEdge,
  type PatchNode,
  type PatchNodeChanges,
  type PatchOperation,
} from "./patch";
export {
  AppliedRecommendationSchema,
  ProjectRecommendationStateSchema,
  RECOMMENDATION_STATE_SCHEMA_VERSION,
  createEmptyRecommendationState,
  parseProjectRecommendationState,
  safeParseProjectRecommendationState,
  type AppliedRecommendation,
  type ProjectRecommendationState,
} from "./recommendation-state";
export {
  DEFAULT_BUILDERS,
  DEFAULT_REGISTRY,
  RECOMMENDATION_REGISTRY_VERSION,
  buildRegistry,
} from "./registry";
export {
  type Applicability,
  type ApplicabilityStatus,
  type BuilderContext,
  type Recommendation,
  type RecommendationBuilder,
  type RecommendationDraft,
  type RecommendationMode,
} from "./types";
