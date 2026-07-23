import { and, desc, eq, inArray } from "drizzle-orm";
import {
  type TelemetryProvider,
  calibrateCapacityFromTelemetry,
  type TelemetryMetricSample,
} from "@axon/architecture-simulation";

import { type Database } from "../db/client";
import { telemetrySources, telemetryMetrics } from "../db/schema";

export class TelemetryService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
  ) {}

  async registerTelemetrySource(
    projectId: string,
    provider: TelemetryProvider,
    name: string,
    endpointUrl: string,
  ): Promise<string> {
    const inserted = await this.db
      .insert(telemetrySources)
      .values({
        ownerId: this.ownerId,
        projectId,
        provider,
        name,
        endpointUrl,
        status: "connected",
      })
      .returning({ id: telemetrySources.id });

    const newId = inserted[0]?.id;
    if (!newId) throw new Error("Failed to register telemetry source");
    return newId;
  }

  async listTelemetrySources(projectId: string) {
    return this.db
      .select()
      .from(telemetrySources)
      .where(
        and(eq(telemetrySources.projectId, projectId), eq(telemetrySources.ownerId, this.ownerId)),
      )
      .orderBy(desc(telemetrySources.createdAt));
  }

  async ingestMetricSamples(
    sourceId: string,
    samples: { componentId: string; metricName: string; value: number; unit: string }[],
  ) {
    if (samples.length === 0) return;

    await this.db.insert(telemetryMetrics).values(
      samples.map((s) => ({
        ownerId: this.ownerId,
        telemetrySourceId: sourceId,
        componentId: s.componentId,
        metricName: s.metricName,
        value: s.value,
        unit: s.unit,
      })),
    );

    await this.db
      .update(telemetrySources)
      .set({ lastSampledAt: new Date() })
      .where(eq(telemetrySources.id, sourceId));
  }

  /**
   * Calibrates a capacity profile from the telemetry actually ingested for this
   * project. Only metrics the calibrator understands are used; unknown metric
   * names are ignored (never guessed). With no usable samples, an empty
   * calibration is returned — telemetry is never fabricated.
   */
  async getCalibratedCapacityProfile(projectId: string) {
    const sources = await this.listTelemetrySources(projectId);
    if (sources.length === 0) {
      return calibrateCapacityFromTelemetry([]);
    }

    const sourceIds = sources.map((s) => s.id);
    const rows = await this.db
      .select({
        componentId: telemetryMetrics.componentId,
        metricName: telemetryMetrics.metricName,
        value: telemetryMetrics.value,
        sampledAt: telemetryMetrics.sampledAt,
      })
      .from(telemetryMetrics)
      .where(
        and(
          eq(telemetryMetrics.ownerId, this.ownerId),
          inArray(telemetryMetrics.telemetrySourceId, sourceIds),
        ),
      );

    const KNOWN_METRICS = new Set<TelemetryMetricSample["metricName"]>([
      "http_requests_per_second",
      "cache_hit_percent",
      "active_units",
      "max_connections",
    ]);
    const samples: TelemetryMetricSample[] = [];
    for (const row of rows) {
      if (KNOWN_METRICS.has(row.metricName as TelemetryMetricSample["metricName"])) {
        samples.push({
          componentId: row.componentId,
          metricName: row.metricName as TelemetryMetricSample["metricName"],
          value: row.value,
          sampledAt: row.sampledAt.toISOString(),
        });
      }
    }

    return calibrateCapacityFromTelemetry(samples);
  }
}
