import { z } from "zod";

/**
 * Domain schemas for repository intelligence. Evidence is the atomic unit: every
 * proposed component and relationship must cite at least one evidence id, so a
 * proposal can never claim something the repository did not show.
 */

export const REPO_INTEL_SCHEMA_VERSION = "1.0";

export const CONFIDENCE_LEVELS = ["confirmed", "high", "medium", "low", "unresolved"] as const;
export const ConfidenceSchema = z.enum(CONFIDENCE_LEVELS);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const EVIDENCE_TYPES = [
  "dependency", // listed in a manifest — weak on its own
  "client-initialization", // explicit client constructed in source — strong
  "container-service", // a Compose service
  "container-image", // a Dockerfile/Compose base image
  "ci-step", // a GitHub Actions step
  "ci-deploy-target", // a deployment target in CI
  "config-env-name", // an environment-variable name (never a value)
  "secret-reference", // a redacted `${{ secrets.X }}` reference (name only)
  "http-route", // a server route registration
  "http-client", // an outbound HTTP client
  "infrastructure-declaration", // IaC definition like Terraform resource or K8s manifest
] as const;
export const EvidenceTypeSchema = z.enum(EVIDENCE_TYPES);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

/** A structured, non-secret fact extracted from a file. */
export const EvidenceFactSchema = z
  .object({
    /** Canonical technology name, e.g. "PostgreSQL". */
    technology: z.string().optional(),
    /** Architecture category, e.g. "database" | "cache" | "queue". */
    category: z.string().optional(),
    /** Raw token that produced the fact, e.g. dependency "pg" or env "DATABASE_URL". */
    name: z.string().optional(),
    detail: z.string().optional(),
  })
  .catchall(z.unknown());
export type EvidenceFact = z.infer<typeof EvidenceFactSchema>;

export const RepositoryEvidenceSchema = z.object({
  id: z.string().min(1),
  filePath: z.string().min(1),
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
  evidenceType: EvidenceTypeSchema,
  /** Which extractor produced this, e.g. "package-json". */
  extractor: z.string().min(1),
  /** A safe, redacted excerpt — never a secret value or a full file. */
  excerpt: z.string().max(500).optional(),
  fact: EvidenceFactSchema,
  confidence: ConfidenceSchema,
});
export type RepositoryEvidence = z.infer<typeof RepositoryEvidenceSchema>;

/** Evidence as produced by an extractor, before a stable id is assigned. */
export type RawEvidence = Omit<RepositoryEvidence, "id">;

export const REVIEW_STATES = ["proposed", "accepted", "rejected", "edited", "unresolved"] as const;
export const ReviewStateSchema = z.enum(REVIEW_STATES);
export type ReviewState = z.infer<typeof ReviewStateSchema>;

export const RELATIONSHIP_KINDS = ["sync", "async", "data", "telemetry"] as const;

export const ProposalComponentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  technology: z.string().optional(),
  confidence: ConfidenceSchema,
  /** Must reference at least one evidence record. */
  evidenceIds: z.array(z.string().min(1)).min(1),
  review: ReviewStateSchema.default("proposed"),
});
export type ProposalComponent = z.infer<typeof ProposalComponentSchema>;

export const ProposalRelationshipSchema = z.object({
  id: z.string().min(1),
  /** Component ids. Direction is meaningful — never inferred from co-existence. */
  source: z.string().min(1),
  target: z.string().min(1),
  kind: z.enum(RELATIONSHIP_KINDS),
  protocol: z.string().optional(),
  optional: z.boolean().optional(),
  confidence: ConfidenceSchema,
  evidenceIds: z.array(z.string().min(1)).min(1),
  review: ReviewStateSchema.default("proposed"),
});
export type ProposalRelationship = z.infer<typeof ProposalRelationshipSchema>;

export const ProposalConflictSchema = z.object({
  componentId: z.string().optional(),
  summary: z.string().min(1),
});

export const PROPOSAL_STATUSES = [
  "draft",
  "ready",
  "partially-accepted",
  "applied",
  "rejected",
  "stale",
  "failed",
] as const;
export const ProposalStatusSchema = z.enum(PROPOSAL_STATUSES);
export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;

export const ArchitectureProposalSchema = z
  .object({
    schemaVersion: z.literal(REPO_INTEL_SCHEMA_VERSION),
    sourceRepositoryFullName: z.string().min(1),
    sourceCommitSha: z.string().min(1),
    components: z.array(ProposalComponentSchema),
    relationships: z.array(ProposalRelationshipSchema),
    conflicts: z.array(ProposalConflictSchema),
    /** Open questions the analysis could not resolve deterministically. */
    unresolved: z.array(z.string()),
    createdAt: z.iso.datetime(),
  })
  .superRefine((proposal, ctx) => {
    const componentIds = new Set(proposal.components.map((c) => c.id));
    for (const rel of proposal.relationships) {
      if (!componentIds.has(rel.source)) {
        ctx.addIssue({ code: "custom", message: `Relationship ${rel.id} has unknown source` });
      }
      if (!componentIds.has(rel.target)) {
        ctx.addIssue({ code: "custom", message: `Relationship ${rel.id} has unknown target` });
      }
    }
  });
export type ArchitectureProposal = z.infer<typeof ArchitectureProposalSchema>;

export function safeParseProposal(input: unknown) {
  return ArchitectureProposalSchema.safeParse(input);
}
