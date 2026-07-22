import { ArchitectureEdgeKindSchema } from "@axon/diagram-schema";
import { z } from "zod";

/**
 * Typed operations over an ArchitectureDocument. A patch describes a change
 * to the AXON architecture model only — it never represents an infrastructure,
 * code, or deployment change.
 */

const nonEmptyString = z.string().min(1);

export const PatchNodeSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  category: nonEmptyString,
  groupId: nonEmptyString.optional(),
  meta: nonEmptyString.optional(),
  planned: z.boolean().optional(),
});

export const PatchNodeChangesSchema = z.object({
  name: nonEmptyString.optional(),
  category: nonEmptyString.optional(),
  groupId: nonEmptyString.optional(),
  meta: nonEmptyString.optional(),
  planned: z.boolean().optional(),
});

export const PatchEdgeSchema = z.object({
  id: nonEmptyString,
  source: nonEmptyString,
  target: nonEmptyString,
  kind: ArchitectureEdgeKindSchema,
});

export const PatchOperationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("add-node"), node: PatchNodeSchema }),
  z.object({
    type: z.literal("update-node"),
    nodeId: nonEmptyString,
    changes: PatchNodeChangesSchema,
  }),
  z.object({ type: z.literal("remove-node"), nodeId: nonEmptyString }),
  z.object({ type: z.literal("add-edge"), edge: PatchEdgeSchema }),
  z.object({
    type: z.literal("update-edge-kind"),
    edgeId: nonEmptyString,
    kind: ArchitectureEdgeKindSchema,
  }),
  z.object({ type: z.literal("remove-edge"), edgeId: nonEmptyString }),
]);

export type PatchNode = z.infer<typeof PatchNodeSchema>;
export type PatchNodeChanges = z.infer<typeof PatchNodeChangesSchema>;
export type PatchEdge = z.infer<typeof PatchEdgeSchema>;
export type PatchOperation = z.infer<typeof PatchOperationSchema>;

/** One operation with its stable identity and human-readable description. */
export interface FingerprintedOperation {
  readonly fingerprint: string;
  readonly operation: PatchOperation;
  readonly description: string;
}

/** Element ids an operation reads or writes — what the user is told will change. */
export function operationElementIds(operation: PatchOperation): string[] {
  switch (operation.type) {
    case "add-node":
      return [operation.node.id];
    case "update-node":
    case "remove-node":
      return [operation.nodeId];
    case "add-edge":
      return [operation.edge.id, operation.edge.source, operation.edge.target];
    case "update-edge-kind":
    case "remove-edge":
      return [operation.edgeId];
  }
}
