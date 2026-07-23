import { z } from "zod";

/**
 * Canonical persisted AXON architecture document, version 1.0.
 * This package is the source of truth for what AXON stores — documents read
 * from any persistence layer must be validated here before use.
 */

export const ARCHITECTURE_SCHEMA_VERSION = "1.0";

const nonEmptyString = z.string().min(1);
const isoDateTime = z.iso.datetime();

export const ArchitectureSourceSchema = z.object({
  kind: z.enum(["manual", "generated", "imported", "sample", "repository"]),
  /** Human-readable origin, e.g. "Sample: SaaS reference architecture". */
  label: nonEmptyString.optional(),
});

export const ArchitectureAssumptionSchema = z.object({
  id: nonEmptyString,
  label: nonEmptyString,
  value: nonEmptyString,
});

export const ArchitectureEdgeKindSchema = z.enum(["sync", "async", "data", "telemetry"]);

export const ArchitectureNodeModelSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  category: nonEmptyString,
  groupId: nonEmptyString.optional(),
  /** Compact technical annotation shown on the node. */
  meta: nonEmptyString.optional(),
  /** Optional explicit visual icon registry id. Heuristic resolution is used when omitted. */
  iconId: nonEmptyString.optional(),
  /** Planned nodes are part of the target design, not the running system. */
  planned: z.boolean().optional(),
  /** Canvas position assigned by AXON layout — never by a model. */
  position: z.object({ x: z.number(), y: z.number() }).optional(),
});

export const ArchitectureEdgeModelSchema = z.object({
  id: nonEmptyString,
  source: nonEmptyString,
  target: nonEmptyString,
  kind: ArchitectureEdgeKindSchema,
});

export const ArchitectureGroupModelSchema = z.object({
  id: nonEmptyString,
  label: nonEmptyString,
});

export const ArchitectureMetadataSchema = z.object({
  /** Tool that produced the document, e.g. "axon-web". */
  generator: nonEmptyString.optional(),
  notes: z.string().optional(),
});

export const ArchitectureDocumentSchema = z
  .object({
    schemaVersion: z.literal(ARCHITECTURE_SCHEMA_VERSION),
    id: nonEmptyString,
    projectId: nonEmptyString,
    name: nonEmptyString,
    description: z.string().optional(),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
    source: ArchitectureSourceSchema,
    assumptions: z.array(ArchitectureAssumptionSchema),
    nodes: z.array(ArchitectureNodeModelSchema),
    edges: z.array(ArchitectureEdgeModelSchema),
    groups: z.array(ArchitectureGroupModelSchema),
    metadata: ArchitectureMetadataSchema,
  })
  .superRefine((document, context) => {
    const nodeIds = new Set<string>();
    for (const node of document.nodes) {
      if (nodeIds.has(node.id)) {
        context.addIssue({ code: "custom", message: `Duplicate node id: ${node.id}` });
      }
      nodeIds.add(node.id);
    }

    const groupIds = new Set<string>();
    for (const group of document.groups) {
      if (groupIds.has(group.id)) {
        context.addIssue({ code: "custom", message: `Duplicate group id: ${group.id}` });
      }
      groupIds.add(group.id);
    }

    for (const node of document.nodes) {
      if (node.groupId !== undefined && !groupIds.has(node.groupId)) {
        context.addIssue({
          code: "custom",
          message: `Node ${node.id} references unknown group ${node.groupId}`,
        });
      }
    }

    const edgeIds = new Set<string>();
    for (const edge of document.edges) {
      if (edgeIds.has(edge.id)) {
        context.addIssue({ code: "custom", message: `Duplicate edge id: ${edge.id}` });
      }
      edgeIds.add(edge.id);
      if (!nodeIds.has(edge.source)) {
        context.addIssue({
          code: "custom",
          message: `Edge ${edge.id} references unknown source ${edge.source}`,
        });
      }
      if (!nodeIds.has(edge.target)) {
        context.addIssue({
          code: "custom",
          message: `Edge ${edge.id} references unknown target ${edge.target}`,
        });
      }
      if (edge.source === edge.target) {
        context.addIssue({ code: "custom", message: `Edge ${edge.id} is a self-loop` });
      }
    }
  });

export type ArchitectureSource = z.infer<typeof ArchitectureSourceSchema>;
export type ArchitectureAssumption = z.infer<typeof ArchitectureAssumptionSchema>;
export type ArchitectureEdgeKindModel = z.infer<typeof ArchitectureEdgeKindSchema>;
export type ArchitectureNodeModel = z.infer<typeof ArchitectureNodeModelSchema>;
export type ArchitectureEdgeModel = z.infer<typeof ArchitectureEdgeModelSchema>;
export type ArchitectureGroupModel = z.infer<typeof ArchitectureGroupModelSchema>;
export type ArchitectureMetadata = z.infer<typeof ArchitectureMetadataSchema>;
export type ArchitectureDocument = z.infer<typeof ArchitectureDocumentSchema>;

/** Parses untrusted input into a document; throws with issues on failure. */
export function parseArchitectureDocument(input: unknown): ArchitectureDocument {
  return ArchitectureDocumentSchema.parse(input);
}

export function safeParseArchitectureDocument(input: unknown) {
  return ArchitectureDocumentSchema.safeParse(input);
}

export interface CreateEmptyDocumentInput {
  id: string;
  projectId: string;
  name: string;
  /** ISO timestamp; callers supply it so document creation stays pure. */
  now: string;
}

export function createEmptyArchitectureDocument(
  input: CreateEmptyDocumentInput,
): ArchitectureDocument {
  return parseArchitectureDocument({
    schemaVersion: ARCHITECTURE_SCHEMA_VERSION,
    id: input.id,
    projectId: input.projectId,
    name: input.name,
    createdAt: input.now,
    updatedAt: input.now,
    source: { kind: "manual" },
    assumptions: [],
    nodes: [],
    edges: [],
    groups: [],
    metadata: { generator: "axon-web" },
  });
}
