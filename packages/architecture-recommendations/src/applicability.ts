import { type ArchitectureDocument } from "@axon/diagram-schema";

import { isOperationSatisfied, previewPatch } from "./apply-patch";
import { type Recommendation } from "./types";

export interface ApplicabilityInput {
  readonly recommendation: Recommendation;
  readonly document: ArchitectureDocument;
  /**
   * True when the audit that produced the source finding no longer describes
   * the current document. A patch derived from a stale finding must not be
   * applied — there is no "apply anyway".
   */
  readonly auditIsStale: boolean;
  /** True when this recommendation was already applied to this document. */
  readonly alreadyApplied?: boolean;
}

/**
 * Decides whether AXON can safely preview and apply a recommendation.
 * Checks run in priority order so the most fundamental blocker is reported.
 */
export function evaluateApplicability({
  recommendation,
  document,
  auditIsStale,
  alreadyApplied = false,
}: ApplicabilityInput) {
  if (recommendation.mode === "manual-review") {
    return {
      status: "manual-review" as const,
      canApply: false,
      reasons: [
        "This change needs an engineering decision that AXON cannot make from the architecture document alone.",
      ],
    };
  }

  if (auditIsStale) {
    return {
      status: "stale" as const,
      canApply: false,
      reasons: [
        "The architecture changed after this audit ran. Rerun the audit before applying this change.",
      ],
    };
  }

  // Idempotency: a recommendation whose operations are all already satisfied
  // must never be applied again, or it would duplicate elements.
  const satisfied = recommendation.operations.every((item) =>
    isOperationSatisfied(document, item.operation),
  );
  if (alreadyApplied || satisfied) {
    return {
      status: "already-applied" as const,
      canApply: false,
      reasons: ["This architecture-document change is already present in the current document."],
    };
  }

  // A dry run is the authoritative conflict check: it catches missing
  // elements, id collisions, and anything the schema would reject.
  const preview = previewPatch(
    document,
    recommendation.operations.map((item) => item.operation),
    document.updatedAt,
  );
  if (!preview.ok) {
    return { status: "conflicted" as const, canApply: false, reasons: preview.reasons };
  }

  return { status: "ready" as const, canApply: true, reasons: [] };
}
