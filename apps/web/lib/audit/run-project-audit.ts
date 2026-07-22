import {
  AUDIT_STATE_SCHEMA_VERSION,
  RULESET_VERSION,
  reconcileFindings,
  runAudit,
  type FindingSeverity,
  type ProjectAuditState,
} from "@axon/architecture-audit";
import { type ArchitectureDocument } from "@axon/diagram-schema";

import { type StatusKind } from "@axon/ui";

/**
 * Why the current audit state can or cannot be trusted against the document
 * the user is looking at right now.
 */
export type AuditFreshness =
  "never-run" | "up-to-date" | "architecture-changed" | "ruleset-updated";

export function getAuditFreshness(
  state: ProjectAuditState | null,
  document: ArchitectureDocument,
): AuditFreshness {
  if (state === null) return "never-run";
  if (state.rulesetVersion !== RULESET_VERSION) return "ruleset-updated";
  if (state.documentId !== document.id || state.documentUpdatedAtAtRun !== document.updatedAt) {
    return "architecture-changed";
  }
  return "up-to-date";
}

export interface ComputeNextAuditStateInput {
  document: ArchitectureDocument;
  previous: ProjectAuditState | null;
  /** ISO timestamp supplied by the caller so this stays a pure function. */
  now: string;
}

/**
 * One full deterministic audit pass: run the ruleset over the document and
 * reconcile against previously persisted findings so acknowledgements and
 * history survive the rerun.
 */
export function computeNextAuditState({
  document,
  previous,
  now,
}: ComputeNextAuditStateInput): ProjectAuditState {
  const candidates = runAudit(document);
  const findings = reconcileFindings({
    previous: previous?.findings ?? [],
    candidates,
    now,
  });
  return {
    schemaVersion: AUDIT_STATE_SCHEMA_VERSION,
    projectId: document.projectId,
    documentId: document.id,
    rulesetVersion: RULESET_VERSION,
    lastRunAt: now,
    documentUpdatedAtAtRun: document.updatedAt,
    findings,
  };
}

/** Shared severity → StatusBadge mapping for lists and canvas overlays. */
export const SEVERITY_STATUS_KIND: Record<FindingSeverity, StatusKind> = {
  high: "critical",
  medium: "warning",
  low: "info",
  info: "neutral",
};
