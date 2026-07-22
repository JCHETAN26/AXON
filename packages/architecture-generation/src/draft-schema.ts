import { z } from "zod";

/**
 * The constrained structure a model is allowed to produce. Deliberately free
 * of anything AXON owns: no ids, no timestamps, no schema versions, no
 * coordinates, no storage keys. The model speaks in human-readable keys;
 * AXON turns a validated draft into a persisted document.
 *
 * Unknown fields a model invents (ids, createdAt, positions, …) are stripped
 * during parsing rather than trusted.
 */

export const DRAFT_LIMITS = {
  minNodes: 3,
  maxNodes: 16,
  maxEdges: 32,
  maxGroups: 6,
  maxAssumptions: 8,
} as const;

const shortString = z.string().min(1).max(80);
const keyString = z.string().min(1).max(64);

export const DraftEdgeKindSchema = z.enum(["sync", "async", "data", "telemetry"]);

export const DraftGroupSchema = z.object({
  key: keyString,
  label: shortString,
});

export const DraftNodeSchema = z.object({
  key: keyString,
  name: shortString,
  category: shortString,
  groupKey: keyString.optional(),
});

export const DraftEdgeSchema = z.object({
  sourceKey: keyString,
  targetKey: keyString,
  kind: DraftEdgeKindSchema,
});

export const DraftAssumptionSchema = z.object({
  label: shortString,
  value: shortString,
});

export const GeneratedArchitectureDraftSchema = z
  .object({
    name: shortString,
    summary: z.string().max(400).optional(),
    assumptions: z.array(DraftAssumptionSchema).max(DRAFT_LIMITS.maxAssumptions),
    groups: z.array(DraftGroupSchema).min(1).max(DRAFT_LIMITS.maxGroups),
    nodes: z.array(DraftNodeSchema).min(DRAFT_LIMITS.minNodes).max(DRAFT_LIMITS.maxNodes),
    edges: z.array(DraftEdgeSchema).min(1).max(DRAFT_LIMITS.maxEdges),
  })
  .superRefine((draft, context) => {
    const nodeKeys = new Set<string>();
    for (const node of draft.nodes) {
      if (nodeKeys.has(node.key)) {
        context.addIssue({ code: "custom", message: `Duplicate node key: ${node.key}` });
      }
      nodeKeys.add(node.key);
    }

    const groupKeys = new Set<string>();
    for (const group of draft.groups) {
      if (groupKeys.has(group.key)) {
        context.addIssue({ code: "custom", message: `Duplicate group key: ${group.key}` });
      }
      groupKeys.add(group.key);
    }

    for (const edge of draft.edges) {
      if (!nodeKeys.has(edge.sourceKey)) {
        context.addIssue({
          code: "custom",
          message: `Edge references unknown source node: ${edge.sourceKey}`,
        });
      }
      if (!nodeKeys.has(edge.targetKey)) {
        context.addIssue({
          code: "custom",
          message: `Edge references unknown target node: ${edge.targetKey}`,
        });
      }
      if (edge.sourceKey === edge.targetKey) {
        context.addIssue({ code: "custom", message: `Self-loop edge on ${edge.sourceKey}` });
      }
    }
  });

export type DraftEdgeKind = z.infer<typeof DraftEdgeKindSchema>;
export type DraftGroup = z.infer<typeof DraftGroupSchema>;
export type DraftNode = z.infer<typeof DraftNodeSchema>;
export type DraftEdge = z.infer<typeof DraftEdgeSchema>;
export type DraftAssumption = z.infer<typeof DraftAssumptionSchema>;
export type GeneratedArchitectureDraft = z.infer<typeof GeneratedArchitectureDraftSchema>;

/**
 * JSON-schema rendition of the draft shape for providers that support
 * structured outputs. Kept intentionally simple (no cross-field checks —
 * the zod pipeline remains the authority).
 */
export const DRAFT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "assumptions", "groups", "nodes", "edges"],
  properties: {
    name: { type: "string" },
    summary: { type: "string" },
    assumptions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value"],
        properties: { label: { type: "string" }, value: { type: "string" } },
      },
    },
    groups: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "label"],
        properties: { key: { type: "string" }, label: { type: "string" } },
      },
    },
    nodes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "name", "category"],
        properties: {
          key: { type: "string" },
          name: { type: "string" },
          category: { type: "string" },
          groupKey: { type: "string" },
        },
      },
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sourceKey", "targetKey", "kind"],
        properties: {
          sourceKey: { type: "string" },
          targetKey: { type: "string" },
          kind: { type: "string", enum: ["sync", "async", "data", "telemetry"] },
        },
      },
    },
  },
} as const;
