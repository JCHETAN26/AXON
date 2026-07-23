import { z } from "zod";

export const MULTICLOUD_STATE_SCHEMA_VERSION = "1.0";

const ProviderSchema = z.enum(["aws", "gcp", "azure"]);

export const MultiCloudStateSchema = z.object({
  schemaVersion: z.literal(MULTICLOUD_STATE_SCHEMA_VERSION),
  projectId: z.string().min(1),
  documentId: z.string().min(1),
  sourceProvider: ProviderSchema,
  targetProvider: ProviderSchema,
  targetOverrides: z.record(z.string().min(1), z.string().min(1)),
  updatedAt: z.iso.datetime(),
});

export type MultiCloudState = z.infer<typeof MultiCloudStateSchema>;

export function safeParseMultiCloudState(input: unknown) {
  return MultiCloudStateSchema.safeParse(input);
}
