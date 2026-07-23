import { z } from "zod";

export const CLOUD_PROVIDERS = ["aws", "gcp"] as const;
export const CloudProviderSchema = z.enum(CLOUD_PROVIDERS);
export type CloudProvider = z.infer<typeof CloudProviderSchema>;

export const RECONCILIATION_STATUSES = [
  "matched",
  "unmanaged",
  "missing",
  "drift",
] as const;

export const CloudReconciliationStatusSchema = z.enum(RECONCILIATION_STATUSES);
export type CloudReconciliationStatus = z.infer<typeof CloudReconciliationStatusSchema>;

export const DiscoveredCloudAssetSchema = z.object({
  id: z.string().min(1),
  provider: CloudProviderSchema,
  resourceType: z.string().min(1),
  name: z.string().min(1),
  region: z.string().min(1),
  accountOrProjectId: z.string().min(1),
  reconciliationStatus: CloudReconciliationStatusSchema,
  matchedIaCResourceId: z.string().optional(),
  tags: z.record(z.string(), z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  discoveredAt: z.string().datetime(),
});

export type DiscoveredCloudAsset = z.infer<typeof DiscoveredCloudAssetSchema>;

export const CloudConnectionSchema = z.object({
  id: z.string().min(1),
  provider: CloudProviderSchema,
  accountOrProjectId: z.string().min(1),
  roleArnOrServiceAccount: z.string().min(1),
  status: z.enum(["connected", "invalid", "disconnected"]).default("connected"),
  lastDiscoveredAt: z.string().datetime().optional(),
});

export type CloudConnection = z.infer<typeof CloudConnectionSchema>;

export const CloudDiscoveryRunSchema = z.object({
  id: z.string().min(1),
  connectionId: z.string().min(1),
  status: z.enum(["pending", "running", "completed", "failed"]).default("pending"),
  discoveredAssetCount: z.number().int().nonnegative().default(0),
  matchedAssetCount: z.number().int().nonnegative().default(0),
  unmanagedAssetCount: z.number().int().nonnegative().default(0),
  proposalId: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type CloudDiscoveryRun = z.infer<typeof CloudDiscoveryRunSchema>;
