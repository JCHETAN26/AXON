import { z } from "zod";
import { ArchitectureDocumentSchema } from "./architecture-document";

export const SNAPSHOT_CREATION_REASONS = [
  "user-edit",
  "prompt-generation",
  "repository-analysis",
  "IaC-analysis",
  "Git-push",
  "pull-request-analysis",
  "cloud-discovery",
  "telemetry-calibration",
  "recommendation-applied",
  "scenario-applied",
  "migration-proposal",
  "manual-snapshot",
] as const;

export const SnapshotCreationReasonSchema = z.enum(SNAPSHOT_CREATION_REASONS);
export type SnapshotCreationReason = z.infer<typeof SnapshotCreationReasonSchema>;

export const SNAPSHOT_STATUSES = ["active", "superseded", "archived"] as const;
export const SnapshotStatusSchema = z.enum(SNAPSHOT_STATUSES);
export type SnapshotStatus = z.infer<typeof SnapshotStatusSchema>;

export const ArchitectureSnapshotSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  documentVersion: z.number().int().positive(),
  payload: ArchitectureDocumentSchema,
  creationReason: SnapshotCreationReasonSchema,
  createdByUserId: z.string().optional(),
  previousSnapshotId: z.string().optional(),
  semanticHash: z.string().min(1),
  status: SnapshotStatusSchema.default("active"),
  createdAt: z.string().datetime(),
});

export type ArchitectureSnapshot = z.infer<typeof ArchitectureSnapshotSchema>;

export const DRIFT_CATEGORIES = [
  "intended-vs-repository",
  "repository-vs-terraform",
  "repository-vs-kubernetes",
  "iac-vs-accepted",
  "commit-vs-commit",
  "snapshot-vs-proposal",
] as const;

export const DriftCategorySchema = z.enum(DRIFT_CATEGORIES);
export type DriftCategory = z.infer<typeof DriftCategorySchema>;

export const DRIFT_STATUSES = [
  "detected",
  "acknowledged",
  "accepted",
  "rejected",
  "resolved",
  "stale",
  "superseded",
] as const;

export const DriftStatusSchema = z.enum(DRIFT_STATUSES);
export type DriftStatus = z.infer<typeof DriftStatusSchema>;

export const ArchitectureDriftSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  baseSnapshotId: z.string().min(1),
  comparedSnapshotId: z.string().optional(),
  driftCategory: DriftCategorySchema,
  status: DriftStatusSchema.default("detected"),
  semanticChanges: z.object({
    addedNodes: z.array(z.string()),
    removedNodes: z.array(z.string()),
    modifiedNodes: z.array(z.string()),
    addedEdges: z.array(z.string()),
    removedEdges: z.array(z.string()),
  }),
  severity: z.enum(["critical", "high", "medium", "low"]),
  confidence: z.enum(["confirmed", "high", "medium", "low", "unresolved"]),
  userDecision: z.enum(["accepted", "rejected", "acknowledged", "unresolved"]).optional(),
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),
});

export type ArchitectureDrift = z.infer<typeof ArchitectureDriftSchema>;
