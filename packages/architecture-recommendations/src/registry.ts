import { deadLetterPathBuilder } from "./builders/dead-letter-path";
import { isolatedComponentBuilder } from "./builders/isolated-component";
import { plannedDependencyBuilder } from "./builders/planned-dependency";
import { singlePointOfFailureBuilder } from "./builders/single-point-of-failure";
import { telemetryCoverageBuilder } from "./builders/telemetry-coverage";
import { type RecommendationBuilder } from "./types";

/** Bumped when a builder is added, removed, or changes behaviour. */
export const RECOMMENDATION_REGISTRY_VERSION = "1.0.0";

export const DEFAULT_BUILDERS: readonly RecommendationBuilder[] = [
  deadLetterPathBuilder,
  isolatedComponentBuilder,
  plannedDependencyBuilder,
  singlePointOfFailureBuilder,
  telemetryCoverageBuilder,
];

/**
 * Rule id → builder. A recommendation can only exist where a supported
 * builder responds to a persisted finding's rule; findings from any other
 * rule are reported as unsupported rather than guessed at.
 */
export function buildRegistry(
  builders: readonly RecommendationBuilder[] = DEFAULT_BUILDERS,
): ReadonlyMap<string, RecommendationBuilder> {
  return new Map(builders.map((builder) => [builder.ruleId, builder]));
}

export const DEFAULT_REGISTRY = buildRegistry();
