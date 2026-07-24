import { and, eq, desc } from "drizzle-orm";
import { type CloudProvider, reconcileCloudAssets } from "@axon/repo-intel";

import { type Database } from "../db/client";
import { cloudConnections, cloudDiscoveryRuns } from "../db/schema";
import {
  type CloudInventoryAdapter,
  FixtureCloudInventoryAdapter,
} from "./cloud-inventory-adapter";

export class CloudDiscoveryService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
    /**
     * Where discovered assets come from. Defaults to the deterministic fixture
     * adapter; inject a live read-only adapter to read a real account without
     * changing any downstream discovery/reconciliation/persistence code.
     */
    private readonly inventory: CloudInventoryAdapter = new FixtureCloudInventoryAdapter()
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

    // Read-only cloud asset discovery via the injected inventory adapter. The
    // service never fabricates assets inline — it only reconciles whatever the
    // adapter returns, so swapping fixture for live is a one-line change.
    const rawAssets = await this.inventory.listAssets({
      provider: conn.provider as CloudProvider,
      accountOrProjectId: conn.accountOrProjectId,
    });

    const reconciliation = reconcileCloudAssets(rawAssets, declaredIacNames);

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
