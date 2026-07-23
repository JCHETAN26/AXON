import { describe, it, expect } from "vitest";
import { 
  calibrateCapacityFromTelemetry, 
  type TelemetryMetricSample 
} from "./telemetry-calibrator";
import { resolveCapacity } from "./capacity-profile";

describe("telemetry-calibrator", () => {
  it("calibrates capacity overrides from metric samples and applies telemetry-measured value basis", () => {
    const samples: TelemetryMetricSample[] = [
      {
        componentId: "node-web",
        metricName: "http_requests_per_second",
        value: 1200,
        sampledAt: "2026-04-01T00:00:00Z",
      },
      {
        componentId: "node-web",
        metricName: "active_units",
        value: 12,
        sampledAt: "2026-04-01T00:00:00Z",
      },
    ];

    const result = calibrateCapacityFromTelemetry(samples);
    expect(result.calibratedComponentCount).toBe(1);
    expect(result.calibrationConfidence).toBe("confirmed");

    const webTelemetryOverride = result.calibratedProfile.components["node-web"];

    const resolved = resolveCapacity("service", undefined, {}, webTelemetryOverride);

    expect(resolved.requestsPerSecondPerUnit).toBe(1200);
    expect(resolved.units).toBe(12);
    expect(resolved.fieldBasis.requestsPerSecondPerUnit).toBe("telemetry-measured");
    expect(resolved.fieldBasis.units).toBe("telemetry-measured");
  });
});
