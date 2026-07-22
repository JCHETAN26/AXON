import { type ArchitectureDocument, type GraphIndex } from "@axon/diagram-schema";

export type FindingSeverity = "high" | "medium" | "low" | "info";

export type FindingState = "open" | "acknowledged" | "resolved";

export interface FindingEvidence {
  /** One observable fact read from the architecture document. */
  readonly text: string;
  /** Node and edge ids the fact was read from. */
  readonly elementIds: readonly string[];
}

/**
 * What a rule reports. The engine — not the rule — assigns identity
 * (rule id, rule version, fingerprint) when it turns a draft into a
 * candidate, so rules cannot accidentally break fingerprint stability.
 */
export interface FindingDraft {
  readonly severity: FindingSeverity;
  readonly title: string;
  /** What AXON detected — a structural statement about the document. */
  readonly detected: string;
  /** Architecture elements that caused the finding. */
  readonly elementIds: readonly string[];
  readonly evidence: readonly FindingEvidence[];
  /** What AXON inferred from the structure — never a claim about production. */
  readonly inference: string;
  /** What this rule cannot see. */
  readonly limitation: string;
  /** A recommended review or change. */
  readonly recommendation: string;
  /**
   * Stable identity of the finding within its rule. Defaults to the sorted
   * element ids; rules should pin it to the smallest stable subject (usually
   * a single node id) so acknowledgements survive unrelated edits.
   */
  readonly fingerprintKey?: string;
}

export interface RuleContext {
  readonly document: ArchitectureDocument;
  readonly index: GraphIndex;
}

export interface AuditRule {
  readonly id: string;
  /** Bumped whenever the rule's logic or copy changes meaningfully. */
  readonly version: string;
  readonly description: string;
  evaluate(context: RuleContext): FindingDraft[];
}

/** A draft with engine-assigned identity — the deterministic output of a run. */
export interface FindingCandidate {
  readonly ruleId: string;
  readonly ruleVersion: string;
  readonly fingerprint: string;
  readonly severity: FindingSeverity;
  readonly title: string;
  readonly detected: string;
  readonly elementIds: readonly string[];
  readonly evidence: readonly FindingEvidence[];
  readonly inference: string;
  readonly limitation: string;
  readonly recommendation: string;
}
