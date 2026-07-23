import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { TelemetryService } from "./telemetry-service";
import { type Database } from "../db/client";
import { telemetryMetrics } from "../db/schema";
import { createTestDatabase, resetTestDatabase } from "../db/testing";
import { ServerProjectRepository } from "../repositories/server-project-repository";
import { seedUser } from "../test-support/seed";

let db: Database;

beforeAll(async () => {
  db = await createTestDatabase();
});
beforeEach(async () => {
  await resetTestDatabase(db);
});

async function seedProject(email: string) {
  const userId = await seedUser(db, email);
  const created = await new ServerProjectRepository(db, userId).createProject({
    name: "P",
    template: "blank",
  });
  return { userId, projectId: created.project.id };
}

describe("TelemetryService (real DB)", () => {
  it("registers a source and ingests metric samples", async () => {
    const { userId, projectId } = await seedProject("a@example.com");
    const service = new TelemetryService(db, userId);

    const sourceId = await service.registerTelemetrySource(
      projectId,
      "prometheus",
      "prod",
      "https://prom.internal/api",
    );
    expect(await service.listTelemetrySources(projectId)).toHaveLength(1);

    await service.ingestMetricSamples(sourceId, [
      { componentId: "web", metricName: "rps", value: 1200, unit: "req/s" },
      { componentId: "db", metricName: "conns", value: 80, unit: "count" },
    ]);
    const stored = await db
      .select()
      .from(telemetryMetrics)
      .where(eq(telemetryMetrics.telemetrySourceId, sourceId));
    expect(stored).toHaveLength(2);
  });

  it("scopes telemetry sources by owner", async () => {
    const { userId, projectId } = await seedProject("a@example.com");
    await new TelemetryService(db, userId).registerTelemetrySource(
      projectId,
      "prometheus",
      "prod",
      "https://prom.internal/api",
    );
    const intruder = new TelemetryService(db, await seedUser(db, "b@example.com"));
    expect(await intruder.listTelemetrySources(projectId)).toHaveLength(0);
  });
});
