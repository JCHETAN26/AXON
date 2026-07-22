import { isolatedComponentRule } from "./rules/isolated-component";
import { missingDeadLetterPathRule } from "./rules/missing-dead-letter-path";
import { plannedDependencyRule } from "./rules/planned-dependency";
import { singlePointOfFailureRule } from "./rules/single-point-of-failure";
import { telemetryCoverageRule } from "./rules/telemetry-coverage";
import { type AuditRule } from "./types";

/**
 * Bumped whenever a rule is added, removed, or changes behavior. Persisted
 * audit runs record the version so the UI can tell users a rerun is worth it.
 */
export const RULESET_VERSION = "1.0.0";

export interface AuditRuleset {
  readonly version: string;
  readonly rules: readonly AuditRule[];
}

export const DEFAULT_RULESET: AuditRuleset = {
  version: RULESET_VERSION,
  // Kept sorted by rule id; runAudit re-sorts defensively either way.
  rules: [
    isolatedComponentRule,
    missingDeadLetterPathRule,
    plannedDependencyRule,
    singlePointOfFailureRule,
    telemetryCoverageRule,
  ],
};
