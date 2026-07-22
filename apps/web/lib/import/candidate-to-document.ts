import { type ArchitectureCandidate, type ImportOptions } from "@axon/architecture-compose-import";
import {
  ARCHITECTURE_SCHEMA_VERSION,
  safeParseArchitectureDocument,
  type ArchitectureDocument,
} from "@axon/diagram-schema";

export interface BuildImportedDocumentInput {
  /** The candidate architecture from the importer. */
  readonly candidate: ArchitectureCandidate;
  /** The project's existing document, whose identity must be preserved. */
  readonly base: ArchitectureDocument;
  readonly importerVersion: string;
  readonly options: ImportOptions;
  /** ISO timestamp; supplied so this stays pure. */
  readonly now: string;
}

export interface BuildImportedDocumentSuccess {
  readonly ok: true;
  readonly document: ArchitectureDocument;
}

export interface BuildImportedDocumentFailure {
  readonly ok: false;
  readonly reasons: readonly string[];
}

/**
 * Builds a validated ArchitectureDocument from an import candidate.
 *
 * AXON — never the importer — owns document identity: the id, projectId,
 * schema version, and createdAt come from the existing project document and
 * are preserved. Positions are left unassigned so the canvas layout places
 * them, keeping AXON in control of coordinates. The result is validated before
 * it is returned, so an invalid document can never reach persistence.
 */
export function buildImportedDocument(
  input: BuildImportedDocumentInput,
): BuildImportedDocumentSuccess | BuildImportedDocumentFailure {
  const { candidate, base, importerVersion, now } = input;

  const candidate_document = {
    schemaVersion: ARCHITECTURE_SCHEMA_VERSION,
    id: base.id,
    projectId: base.projectId,
    name: base.name,
    ...(base.description !== undefined && { description: base.description }),
    createdAt: base.createdAt,
    updatedAt: now,
    source: {
      kind: "imported" as const,
      label: "Imported from Docker Compose",
    },
    // Assumptions are architecture-level inputs; an import starts a fresh set.
    assumptions: [],
    nodes: candidate.nodes.map((node) => ({
      id: node.id,
      name: node.name,
      category: node.category,
      ...(node.groupId !== undefined && { groupId: node.groupId }),
      ...(node.meta !== undefined && { meta: node.meta }),
    })),
    edges: candidate.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      kind: edge.kind,
    })),
    groups: candidate.groups.map((group) => ({ id: group.id, label: group.label })),
    metadata: {
      generator: "axon-web",
      notes: `Imported from Docker Compose via importer v${importerVersion}.`,
    },
  };

  const validated = safeParseArchitectureDocument(candidate_document);
  if (!validated.success) {
    return {
      ok: false,
      reasons: validated.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  }
  return { ok: true, document: validated.data };
}
