"use client";

import { useState } from "react";

import { MonitoringCanvas } from "./monitoring-canvas";
import { MonitoringTimeControl } from "./monitoring-time-control";
import { RootCausePanel } from "./root-cause-panel";
import { TelemetrySourceBadge } from "./telemetry-source-badge";
import { getNode } from "@/data/demo-architecture";
import { MONITORING_TIMELINE } from "@/data/monitoring";

export function LiveMonitoring() {
  const [stepIndex, setStepIndex] = useState(MONITORING_TIMELINE.length - 1);
  const step = MONITORING_TIMELINE[stepIndex] ?? MONITORING_TIMELINE[0];

  if (step === undefined) {
    return null;
  }

  const statusText =
    step.incident === null
      ? `T ${step.shortLabel} · no active incidents`
      : `T ${step.shortLabel} · 1 active incident · ${getNode(step.incident.affectedNodeId).name}`;

  return (
    <section
      id="monitoring"
      aria-labelledby="monitoring-heading"
      className="scroll-mt-14 border-t border-border px-5 py-16 md:px-8 lg:px-16 lg:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <h2 id="monitoring-heading" className="type-headline-lg max-w-2xl text-balance">
          Runtime truth, overlaid on the architecture.
        </h2>
        <p className="type-body-lg mt-4 max-w-2xl text-foreground-muted">
          Telemetry renders directly on the system map, and incidents arrive with evidence-backed
          root cause — confidence included.
        </p>
        <p className="type-label-caps mt-3 text-accent">Simulated telemetry preview</p>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
          <MonitoringTimeControl stepIndex={stepIndex} onChange={setStepIndex} />
          <TelemetrySourceBadge />
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[3fr_2fr] lg:gap-8">
          <MonitoringCanvas step={step} />
          <RootCausePanel incident={step.incident} />
        </div>

        <p
          role="status"
          aria-live="polite"
          aria-label="Monitoring status"
          className="type-mono-data mt-6 text-foreground-muted"
        >
          {statusText}
        </p>
      </div>
    </section>
  );
}
