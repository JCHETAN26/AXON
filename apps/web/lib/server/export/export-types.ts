import { type ArchitectureDocument } from "@axon/diagram-schema";

/**
 * Versioned AXON export bundles. These are *AXON model* exports — a snapshot of
 * the architecture documents and derived artifacts a user has created in AXON.
 * They are not an infrastructure backup and cannot restore a deployment.
 *
 * Exports never contain OAuth tokens, sessions, invite codes/hashes, provider
 * credentials, database metadata, raw Compose YAML, imported secret values, or
 * any other user's data.
 */

export const EXPORT_SCHEMA_VERSION = "1.0";

/** Safe summary of a Compose import — never the raw YAML or any secret. */
export interface SafeImportSummary {
  readonly hasDraft: true;
  readonly categoryOverrideCount: number;
  readonly updatedAt: string;
  readonly note: string;
}

export interface ExportedProjectMeta {
  readonly name: string;
  readonly description?: string;
  readonly status: string;
  readonly startingPoint: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AxonProjectExport {
  readonly exportSchemaVersion: typeof EXPORT_SCHEMA_VERSION;
  readonly kind: "axon-project-export";
  readonly exportedAt: string;
  readonly productVersion?: string;
  readonly disclaimer: string;
  readonly project: ExportedProjectMeta;
  readonly architectureDocument: ArchitectureDocument;
  readonly audit?: unknown;
  readonly recommendations?: unknown;
  readonly simulationProfile?: unknown;
  readonly latestSimulationRun?: unknown;
  readonly importSummary?: SafeImportSummary;
}

export interface ExportedAccountIdentity {
  /** GitHub display name where available. Never an internal database id. */
  readonly name?: string;
  readonly email?: string;
  readonly betaAccess: boolean;
  readonly accountCreatedAt?: string;
}

export interface AxonAccountExport {
  readonly exportSchemaVersion: typeof EXPORT_SCHEMA_VERSION;
  readonly kind: "axon-account-export";
  readonly exportedAt: string;
  readonly productVersion?: string;
  readonly disclaimer: string;
  readonly account: ExportedAccountIdentity;
  readonly projects: readonly AxonProjectExport[];
  readonly generationUsage: readonly { day: string; count: number }[];
  readonly feedback: readonly { category: string; createdAt: string }[];
  readonly operationalNote: string;
}

export const PROJECT_EXPORT_DISCLAIMER =
  "This is an AXON architecture-model export, not an infrastructure backup. It describes the architecture you modelled in AXON and cannot restore or change any deployed system.";

export const ACCOUNT_EXPORT_DISCLAIMER =
  "This export contains the AXON product data owned by your account. It is an AXON model export, not a full deployment backup, and does not include authentication credentials, sessions, or another user's data.";
