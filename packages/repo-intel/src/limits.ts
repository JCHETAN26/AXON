/** Configurable, validated bounds for a single repository analysis. */
export interface AnalysisLimits {
  readonly maxRepositoriesPerUser: number;
  readonly maxAnalysesPerRepoPerHour: number;
  readonly maxFilesExamined: number;
  readonly maxFileBytes: number;
  readonly maxAggregateBytes: number;
  readonly maxPathLength: number;
  readonly maxAnalysisMs: number;
  readonly maxEvidence: number;
  readonly maxComponents: number;
  readonly maxRelationships: number;
}

/** Conservative defaults for the first version. */
export const DEFAULT_ANALYSIS_LIMITS: AnalysisLimits = {
  maxRepositoriesPerUser: 3,
  maxAnalysesPerRepoPerHour: 2,
  maxFilesExamined: 500,
  maxFileBytes: 512 * 1024, // 512 KB
  maxAggregateBytes: 10 * 1024 * 1024, // 10 MB
  maxPathLength: 400,
  maxAnalysisMs: 60_000,
  maxEvidence: 1000,
  maxComponents: 100,
  maxRelationships: 250,
};
