import { type CloudProvider, type RawCloudAssetInput } from "@axon/repo-intel";

export interface CloudConnectionContext {
  readonly provider: CloudProvider;
  readonly accountOrProjectId: string;
}

/**
 * Source of read-only cloud inventory for discovery. This is the single seam
 * between "where the assets come from" and everything downstream
 * (reconciliation, drift, persistence). A live, credentialed read-only adapter
 * (AWS/GCP describe/list APIs) implements this same interface and drops in
 * without touching CloudDiscoveryService or the reconciliation engine.
 *
 * `source` is carried so callers and the UI can never mistake fixture data for
 * a real cloud read.
 */
export interface CloudInventoryAdapter {
  readonly source: "fixture" | "live";
  listAssets(connection: CloudConnectionContext): Promise<RawCloudAssetInput[]>;
}

/**
 * Deterministic fixture inventory — NOT real cloud data. Used until a live
 * read-only adapter is credentialed and wired. It mirrors the canonical drift
 * scenario discovery exists to surface: one IaC-managed database and one
 * unmanaged "shadow" VM that no Terraform/Pulumi state knows about.
 */
export class FixtureCloudInventoryAdapter implements CloudInventoryAdapter {
  readonly source = "fixture" as const;

  listAssets(connection: CloudConnectionContext): Promise<RawCloudAssetInput[]> {
    const { provider, accountOrProjectId } = connection;
    const region = provider === "aws" ? "us-east-1" : "us-central1";
    return Promise.resolve([
      {
        provider,
        resourceType:
          provider === "aws" ? "aws_db_instance" : "google_sql_database_instance",
        name: "production-postgres",
        region,
        accountOrProjectId,
        tags: { Environment: "production" },
      },
      {
        provider,
        resourceType: provider === "aws" ? "aws_instance" : "google_compute_instance",
        name: "unmanaged-shadow-vm",
        region,
        accountOrProjectId,
        tags: { ManagedBy: "manual" },
      },
    ]);
  }
}
