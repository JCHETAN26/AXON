import { type ArchitectureDocument } from "@axon/diagram-schema";

import {
  MULTICLOUD_CATALOG_VERSION,
  type CloudCapabilityRecord,
  type MultiCloudProvider,
  findCloudCapability,
  listCloudCapabilities,
} from "./capability-catalog";

export type MultiCloudMappingType =
  | "strong-equivalent"
  | "partial-equivalent"
  | "multiple-candidate"
  | "redesign-required"
  | "unsupported"
  | "custom-user-mapping";

export interface MultiCloudComponentMapping {
  readonly sourceComponentId: string;
  readonly sourceName: string;
  readonly sourceCapability: CloudCapabilityRecord | null;
  readonly targetCandidates: readonly CloudCapabilityRecord[];
  readonly selectedTarget: CloudCapabilityRecord | null;
  readonly mappingType: MultiCloudMappingType;
  readonly confidence: "high" | "medium" | "low";
  readonly unresolvedDecisions: readonly string[];
  readonly migrationConsiderations: readonly string[];
}

export interface MultiCloudPlan {
  readonly sourceProvider: MultiCloudProvider;
  readonly targetProvider: MultiCloudProvider;
  readonly catalogVersion: string;
  readonly assumptions: readonly string[];
  readonly mappings: readonly MultiCloudComponentMapping[];
  readonly warnings: readonly string[];
  readonly confidence: "high" | "medium" | "low";
}

function mappingTypeFor(
  source: CloudCapabilityRecord | null,
  candidates: readonly CloudCapabilityRecord[],
): MultiCloudMappingType {
  if (source === null) return "unsupported";
  if (candidates.length === 0) return "redesign-required";
  if (candidates.length > 1) return "multiple-candidate";
  if (source.category === "queue") return "partial-equivalent";
  return "strong-equivalent";
}

export function planMultiCloudMigration(input: {
  readonly document: ArchitectureDocument;
  readonly sourceProvider: MultiCloudProvider;
  readonly targetProvider: MultiCloudProvider;
}): MultiCloudPlan {
  const warnings: string[] = [];
  if (input.sourceProvider === input.targetProvider) {
    warnings.push(
      "Source and target providers are identical; this is a comparison, not a migration.",
    );
  }
  if (input.sourceProvider === "neutral" || input.targetProvider === "neutral") {
    warnings.push(
      "Cloud-neutral mappings require human confirmation before provider-specific adoption.",
    );
  }

  const targetCatalog = listCloudCapabilities(input.targetProvider);
  const mappings = input.document.nodes.map((node): MultiCloudComponentMapping => {
    const source = findCloudCapability({
      provider: input.sourceProvider,
      ...(node.meta !== undefined && { technology: node.meta }),
      category: node.category,
    });
    const candidates =
      source === null
        ? targetCatalog.filter((record) => record.category === node.category.toLowerCase())
        : targetCatalog.filter((record) => record.category === source.category);
    const mappingType = mappingTypeFor(source, candidates);
    const selectedTarget = candidates[0] ?? null;
    const unresolvedDecisions = [
      ...(source === null ? ["Source capability is not in the curated catalog."] : []),
      ...(mappingType === "partial-equivalent"
        ? ["Validate delivery, ordering, retry, and dead-letter semantics."]
        : []),
      ...(mappingType === "multiple-candidate"
        ? ["Choose one target capability or composite pattern."]
        : []),
      ...(mappingType === "redesign-required" || mappingType === "unsupported"
        ? ["A target design decision is required before migration."]
        : []),
    ];
    return {
      sourceComponentId: node.id,
      sourceName: node.name,
      sourceCapability: source,
      targetCandidates: candidates,
      selectedTarget,
      mappingType,
      confidence:
        mappingType === "strong-equivalent"
          ? "high"
          : mappingType === "partial-equivalent"
            ? "medium"
            : "low",
      unresolvedDecisions,
      migrationConsiderations: [
        ...(source?.migrationConsiderations ?? []),
        ...(selectedTarget?.migrationConsiderations ?? []),
      ],
    };
  });

  return {
    sourceProvider: input.sourceProvider,
    targetProvider: input.targetProvider,
    catalogVersion: MULTICLOUD_CATALOG_VERSION,
    assumptions: [
      "Uses AXON's curated deterministic capability catalog; no live cloud inventory is queried.",
      "Cost, quota, regional availability, and team skill fit require validation before execution.",
    ],
    mappings,
    warnings,
    confidence: mappings.every((mapping) => mapping.confidence === "high")
      ? "high"
      : mappings.some((mapping) => mapping.confidence === "low")
        ? "low"
        : "medium",
  };
}
