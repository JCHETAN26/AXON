import { z } from "zod";
import { type CapacityProfile, type ComponentCapacityOverride } from "./capacity-profile";

export const TELEMETRY_PROVIDERS = [
  "prometheus",
  "cloudwatch",
  "datadog",
  "opentelemetry",
] as const;

export const TelemetryProviderSchema = z.enum(TELEMETRY_PROVIDERS);
export type TelemetryProvider = z.infer<typeof TelemetryProviderSchema>;

export interface TelemetryMetricSample {
  componentId: string;
  metricName: "http_requests_per_second" | "cache_hit_percent" | "active_units" | "max_connections";
  value: number;
  sampledAt: string;
}

export interface CalibrationResult {
  calibratedProfile: CapacityProfile;
  calibratedComponentCount: number;
  calibrationConfidence: "confirmed" | "high" | "medium";
}

/**
 * Calibrates capacity profile overrides from empirical telemetry metric samples.
 */
export function calibrateCapacityFromTelemetry(
  samples: TelemetryMetricSample[]
): CalibrationResult {
  const componentsMap: Record<string, ComponentCapacityOverride> = {};

  for (const sample of samples) {
    let comp = componentsMap[sample.componentId];
    if (!comp) {
      comp = {};
      componentsMap[sample.componentId] = comp;
    }

    switch (sample.metricName) {
      case "http_requests_per_second":
        comp.requestsPerSecondPerUnit = sample.value;
        break;
      case "cache_hit_percent":
        comp.cacheHitPercent = sample.value;
        break;
      case "active_units":
        comp.units = sample.value;
        break;
      case "max_connections":
        comp.maxConnections = sample.value;
        break;
    }
  }

  const calibratedComponentCount = Object.keys(componentsMap).length;

  return {
    calibratedProfile: {
      components: componentsMap,
    },
    calibratedComponentCount,
    calibrationConfidence: calibratedComponentCount > 0 ? "confirmed" : "medium",
  };
}
