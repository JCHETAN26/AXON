import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CloudDiscoveryService } from "./cloud-discovery-service";
import {
  type CloudConnectionContext,
  type CloudInventoryAdapter,
} from "./cloud-inventory-adapter";
import { type Database } from "../db/client";
import { createTestDatabase, resetTestDatabase } from "../db/testing";
import { seedUser } from "../test-support/seed";

let db: Database;

beforeAll(async () => {
  db = await createTestDatabase();
});
beforeEach(async () => {
  await resetTestDatabase(db);
});

describe("CloudDiscoveryService (real DB)", () => {
  it("registers a connection and records a discovery run", async () => {
    const userId = await seedUser(db, "a@example.com");
    const service = new CloudDiscoveryService(db, userId);

    const connId = await service.registerConnection("aws", "1234567890", "arn:aws:iam::role/axon-ro");
    expect(await service.listConnections()).toHaveLength(1);

    const { runId, reconciliation } = await service.runDiscovery(connId, ["production-postgres"]);
    expect(runId).toBeTruthy();
    // One asset is declared in IaC (matched), one is unmanaged shadow.
    expect(reconciliation.summary.matchedCount).toBeGreaterThanOrEqual(1);
    expect(reconciliation.summary.unmanagedCount).toBeGreaterThanOrEqual(1);
  });

  it("reconciles whatever the injected inventory adapter returns", async () => {
    const userId = await seedUser(db, "adapter@example.com");
    // A stand-in "live" adapter that returns only IaC-managed assets — no shadow.
    const allManaged: CloudInventoryAdapter = {
      source: "live",
      listAssets: (conn: CloudConnectionContext) =>
        Promise.resolve([
          {
            provider: conn.provider,
            resourceType: "aws_db_instance",
            name: "production-postgres",
            region: "us-east-1",
            accountOrProjectId: conn.accountOrProjectId,
            tags: {},
          },
        ]),
    };
    const service = new CloudDiscoveryService(db, userId, allManaged);
    const connId = await service.registerConnection("aws", "111122223333", "arn:aws:iam::role/ro");

    const { reconciliation } = await service.runDiscovery(connId, ["production-postgres"]);
    // The service fabricated nothing: it reconciled exactly the adapter's output.
    expect(reconciliation.summary.totalDiscovered).toBe(1);
    expect(reconciliation.summary.matchedCount).toBe(1);
    expect(reconciliation.summary.unmanagedCount).toBe(0);
  });

  it("scopes connections by owner and blocks discovery on unowned connections", async () => {
    const owner = new CloudDiscoveryService(db, await seedUser(db, "a@example.com"));
    const connId = await owner.registerConnection("gcp", "proj-1", "sa@proj.iam");

    const intruder = new CloudDiscoveryService(db, await seedUser(db, "b@example.com"));
    expect(await intruder.listConnections()).toHaveLength(0);
    await expect(intruder.runDiscovery(connId)).rejects.toThrow(/not found/i);
  });
});
