import { 
  type DiscoveredCloudAsset, 
  type CloudProvider, 
  type CloudReconciliationStatus 
} from "./cloud-schemas";

export interface RawCloudAssetInput {
  provider: CloudProvider;
  resourceType: string;
  name: string;
  region: string;
  accountOrProjectId: string;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface CloudReconciliationResult {
  assets: DiscoveredCloudAsset[];
  summary: {
    totalDiscovered: number;
    matchedCount: number;
    unmanagedCount: number;
    missingCount: number;
  };
}

/**
 * Normalizes raw cloud API discovery payloads and reconciles them against declared IaC resource names.
 */
export function reconcileCloudAssets(
  rawInputs: RawCloudAssetInput[],
  declaredIacResourceNames: string[]
): CloudReconciliationResult {
  const declaredSet = new Set(declaredIacResourceNames.map((n) => n.toLowerCase()));
  const matchedSet = new Set<string>();

  const assets: DiscoveredCloudAsset[] = rawInputs.map((raw, index) => {
    const isDeclared = declaredSet.has(raw.name.toLowerCase());
    if (isDeclared) {
      matchedSet.add(raw.name.toLowerCase());
    }

    const reconciliationStatus: CloudReconciliationStatus = isDeclared ? "matched" : "unmanaged";

    return {
      id: `asset-${raw.provider}-${index + 1}`,
      provider: raw.provider,
      resourceType: raw.resourceType,
      name: raw.name,
      region: raw.region,
      accountOrProjectId: raw.accountOrProjectId,
      reconciliationStatus,
      matchedIaCResourceId: isDeclared ? `iac-${raw.name}` : undefined,
      tags: raw.tags,
      metadata: raw.metadata,
      discoveredAt: new Date().toISOString(),
    };
  });

  const missingCount = declaredIacResourceNames.filter(
    (name) => !matchedSet.has(name.toLowerCase())
  ).length;

  const matchedCount = assets.filter((a) => a.reconciliationStatus === "matched").length;
  const unmanagedCount = assets.filter((a) => a.reconciliationStatus === "unmanaged").length;

  return {
    assets,
    summary: {
      totalDiscovered: assets.length,
      matchedCount,
      unmanagedCount,
      missingCount,
    },
  };
}
