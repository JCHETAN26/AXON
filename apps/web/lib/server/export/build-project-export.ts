import { safeParseProjectAuditState } from "@axon/architecture-audit";
import { safeParseProjectRecommendationState } from "@axon/architecture-recommendations";
import { safeParseProjectSimulationState } from "@axon/architecture-simulation";
import { safeParseArchitectureDocument, type ArchitectureDocument } from "@axon/diagram-schema";

import { ImportDraftSchema } from "@/lib/import/import-repository";
import {
  EXPORT_SCHEMA_VERSION,
  PROJECT_EXPORT_DISCLAIMER,
  type AxonProjectExport,
  type SafeImportSummary,
} from "./export-types";

/** Raw, owner-scoped inputs gathered from the database for one project. */
export interface ProjectExportInput {
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly document: unknown;
  /** Artifact payloads keyed by kind, as stored (validated here). */
  readonly artifacts: Partial<
    Record<"audit" | "recommendation" | "simulation" | "import", unknown>
  >;
}

/**
 * Assembles a validated, versioned project export. Every domain record is
 * re-validated against its schema before inclusion; anything invalid is
 * omitted rather than exported blindly. The Compose import is reduced to a safe
 * summary — the raw YAML and any imported values are never exported.
 *
 * Pure and deterministic given its inputs and the supplied clock.
 */
export function assembleProjectExport(
  input: ProjectExportInput,
  now: Date,
  productVersion?: string,
): AxonProjectExport {
  const document = safeParseArchitectureDocument(input.document);
  if (!document.success) {
    throw new Error("Project architecture document failed validation; refusing to export.");
  }
  const doc: ArchitectureDocument = document.data;

  const audit = validate(input.artifacts.audit, (v) => safeParseProjectAuditState(v));
  const recommendations = validate(input.artifacts.recommendation, (v) =>
    safeParseProjectRecommendationState(v),
  );
  const simulation = validate(input.artifacts.simulation, (v) =>
    safeParseProjectSimulationState(v),
  );
  const importSummary = summarizeImport(input.artifacts.import);

  return {
    exportSchemaVersion: EXPORT_SCHEMA_VERSION,
    kind: "axon-project-export",
    exportedAt: now.toISOString(),
    ...(productVersion !== undefined && { productVersion }),
    disclaimer: PROJECT_EXPORT_DISCLAIMER,
    project: {
      name: input.name,
      ...(input.description !== null && { description: input.description }),
      status: "active",
      startingPoint: doc.source.kind,
      createdAt: input.createdAt.toISOString(),
      updatedAt: input.updatedAt.toISOString(),
    },
    architectureDocument: doc,
    ...(audit !== undefined && { audit }),
    ...(recommendations !== undefined && { recommendations }),
    // Split the persisted simulation state into profile + latest run for the
    // export, mirroring the export type. Both come from the same validated
    // record.
    ...(simulation !== undefined && {
      simulationProfile: (simulation as { profile?: unknown }).profile,
      latestSimulationRun: (simulation as { latestRun?: unknown }).latestRun ?? undefined,
    }),
    ...(importSummary !== undefined && { importSummary }),
  };
}

function validate(
  value: unknown,
  parse: (v: unknown) => { success: boolean; data?: unknown },
): unknown {
  if (value === undefined || value === null) return undefined;
  const result = parse(value);
  return result.success ? result.data : undefined;
}

/**
 * Reduces a Compose import draft to a safe summary. The stored draft contains
 * `composeText` (raw YAML) and category overrides; NONE of that content is
 * exported — only counts and a timestamp.
 */
function summarizeImport(value: unknown): SafeImportSummary | undefined {
  if (value === undefined || value === null) return undefined;
  const result = ImportDraftSchema.safeParse(value);
  if (!result.success) return undefined;
  return {
    hasDraft: true,
    categoryOverrideCount: Object.keys(result.data.categoryOverrides).length,
    updatedAt: result.data.updatedAt,
    note: "The original Docker Compose source is intentionally excluded from exports.",
  };
}
