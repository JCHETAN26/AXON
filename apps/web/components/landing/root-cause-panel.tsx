import { StatusBadge } from "@axon/ui";

import { EvidenceSource } from "./evidence-source";
import { FindingConfidence } from "./finding-confidence";
import { getNode } from "@/data/demo-architecture";
import { type MonitoringIncident } from "@/data/monitoring";

export function RootCausePanel({ incident }: { incident: MonitoringIncident | null }) {
  if (incident === null) {
    return (
      <div className="border-2 border-border-strong bg-surface p-6">
        <p className="type-label-caps text-foreground-muted">Root cause analysis</p>
        <p className="type-body-md mt-3 text-foreground">
          <span aria-hidden className="text-success">
            ✓{" "}
          </span>
          No active incidents — all monitored services within limits.
        </p>
      </div>
    );
  }

  const node = getNode(incident.affectedNodeId);
  return (
    <div className="border-2 border-critical bg-surface p-6">
      <p className="type-label-caps text-foreground-muted">Root cause analysis</p>
      <h3 className="type-headline-md mt-2 text-balance">{incident.title}</h3>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <StatusBadge kind="critical">Active incident</StatusBadge>
        <span className="type-mono-data text-foreground-muted">node: {node.name}</span>
        <FindingConfidence value={incident.confidence} />
      </div>
      <p className="type-body-md mt-4 text-foreground-muted">{incident.summary}</p>
      <div className="mt-5">
        <p className="type-label-caps text-foreground-muted">Evidence</p>
        <ul className="mt-3 flex flex-col gap-2">
          {incident.evidence.map((evidence) => (
            <EvidenceSource key={evidence.text} evidence={evidence} />
          ))}
        </ul>
      </div>
      <div className="mt-5 border-l-2 border-accent pl-4">
        <p className="type-label-caps text-foreground-muted">Recommendation</p>
        <p className="type-body-md mt-2">{incident.recommendation}</p>
      </div>
      <p className="type-body-md mt-5">
        <a
          href="#architecture-evolution"
          className="text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          See the recommended architecture change
        </a>
      </p>
      <p className="type-mono-data mt-4 text-foreground-muted">
        AI-assisted analysis · simulated preview
      </p>
    </div>
  );
}
