import { z } from "zod";

/**
 * Persisted audit model. Anything read back from storage must be validated
 * here before use — same convention as @axon/diagram-schema.
 */

export const AUDIT_STATE_SCHEMA_VERSION = "1.0";

const nonEmptyString = z.string().min(1);
const isoDateTime = z.iso.datetime();

export const FindingSeveritySchema = z.enum(["high", "medium", "low", "info"]);
export const FindingStateSchema = z.enum(["open", "acknowledged", "resolved"]);

export const FindingEvidenceSchema = z.object({
  text: nonEmptyString,
  elementIds: z.array(nonEmptyString),
});

export const AuditFindingSchema = z.object({
  fingerprint: nonEmptyString,
  ruleId: nonEmptyString,
  ruleVersion: nonEmptyString,
  severity: FindingSeveritySchema,
  title: nonEmptyString,
  detected: nonEmptyString,
  elementIds: z.array(nonEmptyString),
  evidence: z.array(FindingEvidenceSchema),
  inference: nonEmptyString,
  limitation: nonEmptyString,
  recommendation: nonEmptyString,
  state: FindingStateSchema,
  firstDetectedAt: isoDateTime,
  lastSeenAt: isoDateTime,
  acknowledgedAt: isoDateTime.optional(),
  resolvedAt: isoDateTime.optional(),
});

export const ProjectAuditStateSchema = z.object({
  schemaVersion: z.literal(AUDIT_STATE_SCHEMA_VERSION),
  projectId: nonEmptyString,
  documentId: nonEmptyString,
  rulesetVersion: nonEmptyString,
  lastRunAt: isoDateTime,
  /** document.updatedAt at the moment the audit ran — the staleness signal. */
  documentUpdatedAtAtRun: isoDateTime,
  findings: z.array(AuditFindingSchema),
});

export type AuditFinding = z.infer<typeof AuditFindingSchema>;
export type ProjectAuditState = z.infer<typeof ProjectAuditStateSchema>;

export function parseProjectAuditState(input: unknown): ProjectAuditState {
  return ProjectAuditStateSchema.parse(input);
}

export function safeParseProjectAuditState(input: unknown) {
  return ProjectAuditStateSchema.safeParse(input);
}
