"use client";

import { useState } from "react";
import { 
  type TelemetryProvider, 
  type CalibrationResult 
} from "@axon/architecture-simulation";
import { StatusBadge } from "@axon/ui";

export interface TelemetrySourceItem {
  id: string;
  provider: TelemetryProvider;
  name: string;
  endpointUrl: string;
  status: string;
}

export interface TelemetryWorkspaceProps {
  projectId: string;
  sources: TelemetrySourceItem[];
  calibrationResult: CalibrationResult;
  onRegisterSource: (provider: TelemetryProvider, name: string, endpointUrl: string) => Promise<void>;
  onApplyCalibration: () => Promise<void>;
}

export function TelemetryCalibrationWorkspace({
  sources,
  calibrationResult,
  onRegisterSource,
  onApplyCalibration,
}: TelemetryWorkspaceProps) {
  const [selectedProvider, setSelectedProvider] = useState<TelemetryProvider>("prometheus");
  const [name, setName] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleRegister = async () => {
    if (!name || !endpointUrl) return;
    setBusy(true);
    try {
      await onRegisterSource(selectedProvider, name, endpointUrl);
      setName("");
      setEndpointUrl("");
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await onApplyCalibration();
    } finally {
      setApplying(false);
    }
  };

  const { calibratedProfile, calibratedComponentCount, calibrationConfidence } = calibrationResult;
  const componentsList = Object.entries(calibratedProfile.components);

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Spatial Blueprint Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-border-strong bg-surface p-4 shadow-sm">
        <div>
          <h2 className="type-headline-md font-bold text-foreground">
            Runtime Telemetry & Calibrated Simulation Engine
          </h2>
          <p className="type-mono-data mt-1 text-foreground-muted">
            Connected Telemetry Sources: <span className="text-accent">{sources.length}</span> · Measured Components: <strong className="text-success">{calibratedComponentCount}</strong>
          </p>
        </div>

        <button
          type="button"
          disabled={applying || calibratedComponentCount === 0}
          onClick={handleApply}
          className="type-label-caps bg-primary px-4 py-2 text-primary-foreground transition-all hover:bg-accent focus-visible:outline-2 focus-visible:outline-accent"
        >
          {applying ? "APPLYING CALIBRATION..." : "APPLY TELEMETRY TO SIMULATION"}
        </button>
      </div>

      {/* Setup Panel & Component Calibration Feeds */}
      <div className="flex flex-col gap-6 xl:flex-row">
        {/* Left Column: Register Telemetry Source */}
        <div className="w-full xl:w-96 shrink-0 flex flex-col gap-4">
          <div className="border-2 border-border bg-surface p-4 flex flex-col gap-3">
            <h3 className="type-label-caps text-foreground-muted">
              Connect Telemetry Provider
            </h3>

            <div>
              <label htmlFor="telemetry-provider-select" className="type-mono-data text-xs text-foreground-muted">
                Telemetry Provider
              </label>
              <select
                id="telemetry-provider-select"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as TelemetryProvider)}
                className="mt-1 w-full border-2 border-border bg-surface p-2 type-mono-data text-foreground"
              >
                <option value="prometheus">Prometheus</option>
                <option value="cloudwatch">AWS CloudWatch</option>
                <option value="datadog">Datadog APM</option>
                <option value="opentelemetry">OpenTelemetry (OTLP)</option>
              </select>
            </div>

            <div>
              <label htmlFor="telemetry-name-input" className="type-mono-data text-xs text-foreground-muted">
                Source Name
              </label>
              <input
                id="telemetry-name-input"
                type="text"
                placeholder="Production Prometheus"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full border-2 border-border bg-surface p-2 type-mono-data text-foreground"
              />
            </div>

            <div>
              <label htmlFor="telemetry-endpoint-input" className="type-mono-data text-xs text-foreground-muted">
                Endpoint URL / API Target
              </label>
              <input
                id="telemetry-endpoint-input"
                type="text"
                placeholder="https://prometheus.internal:9090"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                className="mt-1 w-full border-2 border-border bg-surface p-2 type-mono-data text-foreground"
              />
            </div>

            <button
              type="button"
              disabled={busy || !name || !endpointUrl}
              onClick={handleRegister}
              className="mt-2 type-label-caps border-2 border-accent bg-accent-muted py-2 text-foreground transition-all hover:bg-accent hover:text-white"
            >
              {busy ? "CONNECTING..." : "CONNECT METRICS PROVIDER"}
            </button>
          </div>

          {/* Connected Sources List */}
          <div className="border-2 border-border bg-surface p-4">
            <h3 className="type-label-caps text-foreground-muted">
              Connected Telemetry Sources ({sources.length})
            </h3>
            <ul className="mt-3 flex flex-col gap-2">
              {sources.map((src) => (
                <li key={src.id} className="border-2 border-border p-3 flex flex-col gap-1 bg-surface">
                  <div className="flex items-center justify-between">
                    <span className="type-body-md font-bold uppercase text-foreground">
                      {src.name}
                    </span>
                    <StatusBadge kind="success">{src.provider}</StatusBadge>
                  </div>
                  <span className="type-mono-data text-xs text-foreground-muted">
                    {src.endpointUrl}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Calibrated Component Metric Feed */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="border-2 border-border bg-surface p-4">
            <div className="flex items-center justify-between border-b-2 border-border pb-3">
              <h3 className="type-label-caps text-foreground-muted">
                Empirical Telemetry Overrides ({componentsList.length})
              </h3>
              <StatusBadge kind={calibrationConfidence === "confirmed" ? "success" : "warning"}>
                Confidence: {calibrationConfidence.toUpperCase()}
              </StatusBadge>
            </div>

            {componentsList.length === 0 ? (
              <p className="type-body-md mt-4 border-2 border-dashed border-border p-6 text-center text-foreground-muted">
                No telemetry metric samples recorded. Connect a metrics provider above.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {componentsList.map(([compId, override]) => (
                  <li key={compId} className="border-2 border-border p-4 flex flex-col gap-2 bg-surface">
                    <div className="flex items-center justify-between">
                      <span className="type-body-md font-bold text-foreground">{compId}</span>
                      <span className="type-label-caps inline-flex items-center gap-1.5 rounded-control border px-2 py-0.5 border-success bg-success-muted text-success text-xs">
                        telemetry-measured
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-4 text-xs type-mono-data text-foreground-muted">
                      {override.requestsPerSecondPerUnit !== undefined && (
                        <span>RPS/Unit: <strong className="text-foreground">{override.requestsPerSecondPerUnit}</strong></span>
                      )}
                      {override.cacheHitPercent !== undefined && (
                        <span>Cache Hit %: <strong className="text-foreground">{override.cacheHitPercent}%</strong></span>
                      )}
                      {override.units !== undefined && (
                        <span>Replicas: <strong className="text-foreground">{override.units}</strong></span>
                      )}
                      {override.maxConnections !== undefined && (
                        <span>Max Connections: <strong className="text-foreground">{override.maxConnections}</strong></span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
