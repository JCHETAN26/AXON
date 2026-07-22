import { type DemoEvidence, type NodeId } from "./demo-architecture";

/**
 * Deterministic monitoring timeline for the landing demonstration: five
 * snapshots in which a connection leak develops in the authentication
 * service. All values are simulated preview telemetry, not live data.
 */

export type NodeHealth = "healthy" | "degraded" | "critical";

export interface OverlayMetric {
  label: string;
  value: string;
}

export interface NodeSample {
  nodeId: NodeId;
  health: NodeHealth;
  metrics: readonly OverlayMetric[];
}

export interface MonitoringIncident {
  id: string;
  title: string;
  affectedNodeId: NodeId;
  /** Confidence percentage, 0–100. */
  confidence: number;
  summary: string;
  evidence: readonly DemoEvidence[];
  recommendation: string;
  /** Audit finding this incident corroborates. */
  relatedFindingId: string;
}

export interface MonitoringStep {
  id: string;
  /** Accessible label, e.g. "20 minutes ago". */
  label: string;
  /** Compact tick label, e.g. "-20m". */
  shortLabel: string;
  offsetMinutes: number;
  samples: readonly NodeSample[];
  incident: MonitoringIncident | null;
}

export const MONITORED_NODE_IDS: readonly NodeId[] = [
  "gateway",
  "auth",
  "app",
  "redis",
  "postgres",
  "rabbitmq",
];

interface AuthState {
  errPct: string;
  cpuPct: string;
  connections: string;
  health: NodeHealth;
  appP95: string;
}

function makeSamples(auth: AuthState): NodeSample[] {
  return [
    {
      nodeId: "gateway",
      health: "healthy",
      metrics: [
        { label: "rps", value: "14.2k" },
        { label: "p95", value: "42ms" },
      ],
    },
    {
      nodeId: "auth",
      health: auth.health,
      metrics: [
        { label: "err", value: auth.errPct },
        { label: "cpu", value: auth.cpuPct },
        { label: "conn", value: auth.connections },
      ],
    },
    {
      nodeId: "app",
      health: "healthy",
      metrics: [
        { label: "rps", value: "12.4k" },
        { label: "p95", value: auth.appP95 },
      ],
    },
    {
      nodeId: "redis",
      health: "healthy",
      metrics: [
        { label: "hit", value: "97.2%" },
        { label: "ops", value: "31k/s" },
      ],
    },
    {
      nodeId: "postgres",
      health: "healthy",
      metrics: [
        { label: "conn", value: "82/300" },
        { label: "iops", value: "64%" },
      ],
    },
    {
      nodeId: "rabbitmq",
      health: "healthy",
      metrics: [
        { label: "depth", value: "12" },
        { label: "consumers", value: "12" },
      ],
    },
  ];
}

const LEAK_INCIDENT_BASE = {
  id: "auth-connection-leak",
  title: "Connection leak in authentication service",
  affectedNodeId: "auth" as NodeId,
  summary:
    "auth-service accumulates database connections without releasing them; error rate and CPU climb in step while request volume stays flat.",
  evidence: [
    { text: "error rate rose 0.1% → 4.2% over 20 minutes", kind: "runtime-telemetry" },
    { text: "open connections grow while request volume is flat", kind: "runtime-telemetry" },
    {
      text: "growth pattern matches an unreleased pool handle in token refresh",
      kind: "ai-inference",
    },
  ] satisfies readonly DemoEvidence[],
  recommendation:
    "Recycle the affected pods to reclaim connections, patch the token-refresh handling, and alert on connection growth.",
  relatedFindingId: "auth-spof",
};

export const MONITORING_TIMELINE: readonly MonitoringStep[] = [
  {
    id: "t-20",
    label: "20 minutes ago",
    shortLabel: "-20m",
    offsetMinutes: -20,
    samples: makeSamples({
      errPct: "0.1%",
      cpuPct: "54%",
      connections: "118",
      health: "healthy",
      appP95: "180ms",
    }),
    incident: null,
  },
  {
    id: "t-15",
    label: "15 minutes ago",
    shortLabel: "-15m",
    offsetMinutes: -15,
    samples: makeSamples({
      errPct: "0.4%",
      cpuPct: "61%",
      connections: "210",
      health: "healthy",
      appP95: "182ms",
    }),
    incident: null,
  },
  {
    id: "t-10",
    label: "10 minutes ago",
    shortLabel: "-10m",
    offsetMinutes: -10,
    samples: makeSamples({
      errPct: "1.2%",
      cpuPct: "74%",
      connections: "384",
      health: "degraded",
      appP95: "196ms",
    }),
    incident: null,
  },
  {
    id: "t-5",
    label: "5 minutes ago",
    shortLabel: "-5m",
    offsetMinutes: -5,
    samples: makeSamples({
      errPct: "2.8%",
      cpuPct: "85%",
      connections: "617",
      health: "degraded",
      appP95: "224ms",
    }),
    incident: { ...LEAK_INCIDENT_BASE, confidence: 74 },
  },
  {
    id: "now",
    label: "now",
    shortLabel: "now",
    offsetMinutes: 0,
    samples: makeSamples({
      errPct: "4.2%",
      cpuPct: "92%",
      connections: "903",
      health: "critical",
      appP95: "260ms",
    }),
    incident: { ...LEAK_INCIDENT_BASE, confidence: 87 },
  },
];
