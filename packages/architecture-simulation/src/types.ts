import { type ComponentKind } from "./component-kind";
import { type ConfidenceLevel } from "./confidence";

/**
 * Where a number came from. Every value shown to a user carries one of these,
 * so a default is never mistaken for a measurement and a projection is never
 * mistaken for an observation.
 */
export type ValueBasis =
  | "user-input"
  | "telemetry-measured"
  | "architecture-input"
  | "axon-default"
  | "derived"
  | "projected"
  | "unmodeled";

export const VALUE_BASIS_LABEL: Record<ValueBasis, string> = {
  "user-input": "User-provided input",
  "telemetry-measured": "Measured runtime telemetry",
  "architecture-input": "Architecture-provided assumption",
  "axon-default": "AXON default assumption",
  derived: "Derived value",
  projected: "Projected result",
  unmodeled: "Not modeled",
};

export interface SimulationEvidence {
  readonly label: string;
  readonly value: string;
  readonly basis: ValueBasis;
}

export type ComponentStatus =
  | "within-capacity"
  | "approaching-limit"
  | "at-limit"
  | "offline"
  | "not-modeled"
  | "no-represented-load";

export interface ComponentResult {
  readonly nodeId: string;
  readonly name: string;
  readonly kind: ComponentKind;
  /** Modeled request rate arriving at this component. */
  readonly inboundRps: number;
  /** Modeled rate continuing downstream (a cache passes on misses only). */
  readonly outboundRps: number;
  /** Estimated utilization of the modeled capacity; 1 means at the limit. */
  readonly utilization: number;
  /**
   * Scenario request rate at which this component is projected to reach its
   * limit. Null when the component carries no load or is not modeled.
   */
  readonly saturationRps: number | null;
  readonly status: ComponentStatus;
  /** How much to trust this projection, graded from input provenance. */
  readonly confidence: ConfidenceLevel;
  readonly confidenceRationale: string;
  readonly evidence: readonly SimulationEvidence[];
  /** Behaviour this model does not attempt to represent. */
  readonly limitations: readonly string[];
}

export interface ProjectedConstraint {
  readonly nodeId: string;
  readonly name: string;
  readonly kind: ComponentKind;
  /** Scenario request rate at which it is projected to reach its limit. */
  readonly saturationRps: number;
  readonly utilizationAtScenario: number;
}

export interface SimulationResult {
  readonly modelVersion: string;
  readonly scenarioId: string;
  readonly requestsPerSecond: number;
  /** Ordered by node id for stable presentation. */
  readonly components: readonly ComponentResult[];
  /** Lowest projected saturation point, or null if nothing is projected to saturate. */
  readonly firstConstraint: ProjectedConstraint | null;
  /** Node ids AXON could not model, and why. */
  readonly unmodeledNodeIds: readonly string[];
  /** Represented dependency cycles; load is not propagated around them. */
  readonly cycleNodeIds: readonly string[];
}
