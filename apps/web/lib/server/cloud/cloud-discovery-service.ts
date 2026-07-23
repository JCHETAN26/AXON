import { and, eq, desc } from "drizzle-orm";
import { 
  type CloudProvider, 
  reconcileCloudAssets, 
  type RawCloudAssetInput 
} from "@axon/repo-intel";

import { type Database } from "../db/client";
import { cloudConnections, cloudDiscoveryRuns } from "../db/schema";

export class CloudDiscoveryService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string
  ) {}

  async registerConnection(
    provider: CloudProvider,
    accountOrProjectId: string,
    roleArnOrServiceAccount: string
  ): Promise<string> {
    const inserted = await this.db
      .insert(cloudConnections)
      .values({
        ownerId: this.ownerId,
        provider,
        accountOrProjectId,
        roleArnOrServiceAccount,
        status: "connected",
      })
      .returning({ id: cloudConnections.id });

    const newId = inserted[0]?.id;
    if (!newId) throw new Error("Failed to register cloud connection");
    return newId;
  }

  async listConnections() {
    return this.db
      .select()
      .from(cloudConnections)
      .where(eq(cloudConnections.ownerId, this.ownerId))
      .orderBy(desc(cloudConnections.createdAt));
  }

  async runDiscovery(connectionId: string, declaredIacNames: string[] = []) {
    const connRows = await this.db
      .select()
      .from(cloudConnections)
      .where(
        and(
          eq(cloudConnections.id, connectionId),
          eq(cloudConnections.ownerId, this.ownerId)
        )
      )
      .limit(1);

    const conn = connRows[0];
    if (!conn) throw new Error("Cloud connection not found");

    // Read-only cloud asset discovery payload
    const mockRawAssets: RawCloudAssetInput[] = [
      {
        provider: conn.provider as CloudProvider,
        resourceType: conn.provider === "aws" ? "aws_db_instance" : "google_sql_database_instance",
        name: "production-postgres",
        region: conn.provider === "aws" ? "us-east-1" : "us-central1",
        accountOrProjectId: conn.accountOrProjectId,
        tags: { Environment: "production" },
      },
      {
        provider: conn.provider as CloudProvider,
        resourceType: conn.provider === "aws" ? "aws_instance" : "google_compute_instance",
        name: "unmanaged-shadow-vm",
        region: conn.provider === "aws" ? "us-east-1" : "us-central1",
        accountOrProjectId: conn.accountOrProjectId,
        tags: { ManagedBy: "manual" },
      },
    ];

    const reconciliation = reconcileCloudAssets(mockRawAssets, declaredIacNames);

    const insertedRun = await this.db
      .insert(cloudDiscoveryRuns)
      .values({
        ownerId: this.ownerId,
        connectionId,
        status: "completed",
        discoveredAssetCount: reconciliation.summary.totalDiscovered,
        matchedAssetCount: reconciliation.summary.matchedCount,
        unmanagedAssetCount: reconciliation.summary.unmanagedCount,
      })
      .returning({ id: cloudDiscoveryRuns.id });

    await this.db
      .update(cloudConnections)
      .set({ lastDiscoveredAt: new Date() })
      .where(eq(cloudConnections.id, connectionId));

    const runId = insertedRun[0]?.id;
    if (!runId) throw new Error("Failed to record cloud discovery run");

    return { runId, reconciliation };
  }
}
