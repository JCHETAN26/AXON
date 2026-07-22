import { CAPACITY_FIELDS_BY_KIND, type ResolvedCapacity } from "./capacity-profile";
import { type ComponentKind } from "./component-kind";

/**
 * How much trust to place in a component's projection, derived purely from
 * where its capacity numbers came from. A model built entirely on AXON
 * defaults deserves less confidence than one the user or their architecture
 * supplied — this is an honesty signal, never a claim of accuracy.
 */
export type ConfidenceLevel = "high" | "medium" | "low" | "not-applicable";

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
  "not-applicable": "Not applicable",
};

export interface Confidence {
  readonly level: ConfidenceLevel;
  readonly rationale: string;
}

/**
 * Grades confidence from the provenance of the fields that matter for a kind:
 * all supplied → high, all AXON defaults → low, a mix → medium. Deterministic
 * and framework-independent.
 */
export function deriveConfidence(kind: ComponentKind, capacity: ResolvedCapacity): Confidence {
  const fields = CAPACITY_FIELDS_BY_KIND[kind];
  if (fields.length === 0) {
    return {
      level: "not-applicable",
      rationale: "AXON has no capacity model for this component, so no confidence is assigned.",
    };
  }

  let supplied = 0;
  for (const field of fields) {
    const basis = capacity.fieldBasis[field];
    if (basis === "user-input" || basis === "architecture-input") {
      supplied += 1;
    }
  }

  if (supplied === fields.length) {
    return {
      level: "high",
      rationale:
        "Every capacity value used for this component comes from your input or the architecture document.",
    };
  }
  if (supplied === 0) {
    return {
      level: "low",
      rationale:
        "Every capacity value used for this component is an AXON default. Supply real numbers to raise confidence.",
    };
  }
  return {
    level: "medium",
    rationale: `${String(supplied)} of ${String(fields.length)} capacity values come from your input or the architecture document; the rest are AXON defaults.`,
  };
}
