/**
 * The canonical demo architecture used across landing-page demonstrations.
 * Every landing surface (hero canvas, mobile flow, audit findings) renders
 * from this single dataset — service details are never hard-coded in JSX.
 *
 * All metrics and findings are illustrative demo values, not measurements.
 */

export type NodeId =
  | "cdn"
  | "gateway"
  | "auth"
  | "app"
  | "payments"
  | "workers"
  | "redis"
  | "postgres"
  | "rabbitmq"
  | "storage"
  | "stripe"
  | "datadog";

export type GroupId = "edge" | "application" | "data" | "external";

export type EdgeKind = "sync" | "async" | "data" | "telemetry";

export type FindingSeverity = "critical" | "high" | "medium" | "healthy";

export interface DemoNode {
  id: NodeId;
  groupId: GroupId;
  /** Service category label, e.g. "Edge CDN". */
  category: string;
  /** Service identifier rendered as the node name. */
  name: string;
  /** Compact illustrative metrics, rendered in JetBrains Mono. */
  metrics: string;
}

export interface DemoGroup {
  id: GroupId;
  label: string;
}

export interface DemoEdge {
  id: string;
  source: NodeId;
  target: NodeId;
  kind: EdgeKind;
  /** Part of the highlighted request path shown in blueprint blue. */
  active: boolean;
}

/**
 * Classification of where a piece of audit evidence comes from. The interface
 * must always distinguish these (docs/design/DESIGN.md §15), so the kind is a
 * typed field, never part of the evidence text.
 */
export type EvidenceKind =
  | "parsed-configuration"
  | "user-assumption"
  | "deterministic-calculation"
  | "runtime-telemetry"
  | "ai-inference";

export const EVIDENCE_KIND_LABEL: Record<EvidenceKind, string> = {
  "parsed-configuration": "Parsed configuration",
  "user-assumption": "User assumption",
  "deterministic-calculation": "Deterministic calculation",
  "runtime-telemetry": "Runtime telemetry",
  "ai-inference": "AI inference",
};

export interface DemoEvidence {
  text: string;
  kind: EvidenceKind;
}

export interface DemoFinding {
  id: string;
  nodeId: NodeId;
  /** Short technical code shown on the canvas marker. */
  code: string;
  title: string;
  severity: FindingSeverity;
  /** Confidence percentage, 0–100. */
  confidence: number;
  /** Concise explanation of why the finding matters. */
  explanation: string;
  evidence: readonly DemoEvidence[];
  recommendation: string;
}

export const DEMO_GROUPS: readonly DemoGroup[] = [
  { id: "edge", label: "Public Edge" },
  { id: "application", label: "Application Layer" },
  { id: "data", label: "Data Layer" },
  { id: "external", label: "External & Observability" },
];

export const DEMO_NODES: readonly DemoNode[] = [
  {
    id: "cdn",
    groupId: "edge",
    category: "Edge CDN",
    name: "cloudflare",
    metrics: "14.2k rps · p95 42ms",
  },
  {
    id: "gateway",
    groupId: "edge",
    category: "Gateway",
    name: "api-gateway",
    metrics: "rate-limit 5k/s",
  },
  {
    id: "auth",
    groupId: "application",
    category: "Auth",
    name: "auth-service",
    metrics: "2 pods · single az",
  },
  {
    id: "app",
    groupId: "application",
    category: "Compute",
    name: "app-service",
    metrics: "go · 6 pods",
  },
  {
    id: "payments",
    groupId: "application",
    category: "Payments",
    name: "payments-service",
    metrics: "pci scope",
  },
  {
    id: "workers",
    groupId: "application",
    category: "Workers",
    name: "worker-pool",
    metrics: "temporal · 8 workers",
  },
  { id: "redis", groupId: "data", category: "Cache", name: "redis-cluster", metrics: "hit 97.2%" },
  {
    id: "postgres",
    groupId: "data",
    category: "Database",
    name: "postgresql",
    metrics: "conn 82/300",
  },
  {
    id: "rabbitmq",
    groupId: "data",
    category: "Broker",
    name: "rabbitmq",
    metrics: "12 consumers",
  },
  {
    id: "storage",
    groupId: "data",
    category: "Storage",
    name: "object-storage",
    metrics: "s3 · versioned",
  },
  {
    id: "stripe",
    groupId: "external",
    category: "External API",
    name: "stripe",
    metrics: "webhooks · signed",
  },
  {
    id: "datadog",
    groupId: "external",
    category: "Observability",
    name: "datadog",
    metrics: "traces · logs",
  },
];

export const DEMO_EDGES: readonly DemoEdge[] = [
  // Highlighted request path: CDN → Gateway → App → Redis / PostgreSQL.
  { id: "cdn-gateway", source: "cdn", target: "gateway", kind: "sync", active: true },
  { id: "gateway-app", source: "gateway", target: "app", kind: "sync", active: true },
  { id: "app-redis", source: "app", target: "redis", kind: "data", active: true },
  { id: "app-postgres", source: "app", target: "postgres", kind: "data", active: true },
  // Supporting synchronous calls.
  { id: "gateway-auth", source: "gateway", target: "auth", kind: "sync", active: false },
  { id: "app-payments", source: "app", target: "payments", kind: "sync", active: false },
  { id: "payments-stripe", source: "payments", target: "stripe", kind: "sync", active: false },
  // Asynchronous events and background data access.
  { id: "app-rabbitmq", source: "app", target: "rabbitmq", kind: "async", active: false },
  { id: "rabbitmq-workers", source: "rabbitmq", target: "workers", kind: "async", active: false },
  { id: "workers-storage", source: "workers", target: "storage", kind: "data", active: false },
  // Telemetry.
  { id: "app-datadog", source: "app", target: "datadog", kind: "telemetry", active: false },
  {
    id: "postgres-datadog",
    source: "postgres",
    target: "datadog",
    kind: "telemetry",
    active: false,
  },
];

/** Revealed in order by the audit demonstration. */
export const DEMO_FINDINGS: readonly DemoFinding[] = [
  {
    id: "auth-spof",
    nodeId: "auth",
    code: "SPOF",
    title: "Authentication service is a single point of failure",
    severity: "critical",
    confidence: 98,
    explanation:
      "Every protected request flows through a single authentication deployment. One zone outage disables login and session validation for all tenants.",
    evidence: [
      { text: "Single availability-zone deployment", kind: "parsed-configuration" },
      { text: "No secondary authentication instance", kind: "parsed-configuration" },
      { text: "All protected requests depend on this service", kind: "deterministic-calculation" },
    ],
    recommendation:
      "Deploy authentication across multiple availability zones and add health-aware routing.",
  },
  {
    id: "rabbitmq-dlq",
    nodeId: "rabbitmq",
    code: "NO_DLQ",
    title: "Message broker has no dead-letter queue",
    severity: "high",
    confidence: 100,
    explanation:
      "Messages that repeatedly fail have no terminal path, so background processing can silently lose work or retry forever.",
    evidence: [
      { text: "No dead-letter exchange configured", kind: "parsed-configuration" },
      { text: "Failed jobs have no terminal retry path", kind: "deterministic-calculation" },
      {
        text: "Poison messages may be retried indefinitely or discarded",
        kind: "ai-inference",
      },
    ],
    recommendation: "Add a dead-letter exchange, retry policy, and failure observability.",
  },
  {
    id: "postgres-saturation",
    nodeId: "postgres",
    code: "SATURATION",
    title: "PostgreSQL is the first projected scaling constraint",
    severity: "high",
    confidence: 89,
    explanation:
      "Under projected load, connection demand crosses the configured limit before any other component saturates.",
    evidence: [
      { text: "300 maximum active connections", kind: "parsed-configuration" },
      { text: "82 ms average transaction duration", kind: "runtime-telemetry" },
      {
        text: "Application replicas can scale independently",
        kind: "deterministic-calculation",
      },
      { text: "No connection pooler or read replica detected", kind: "parsed-configuration" },
    ],
    recommendation:
      "Introduce connection pooling, cache appropriate reads, and evaluate read replicas before increasing application concurrency.",
  },
  {
    id: "datadog-telemetry",
    nodeId: "datadog",
    code: "TELEMETRY_OK",
    title: "Runtime telemetry is connected",
    severity: "healthy",
    confidence: 100,
    explanation:
      "Runtime metrics are flowing and mapped to the architecture, enabling monitoring overlays and evidence-backed findings.",
    evidence: [
      { text: "Metrics source detected", kind: "runtime-telemetry" },
      {
        text: "Service identifiers mapped to architecture nodes",
        kind: "deterministic-calculation",
      },
      { text: "Health data available for supported services", kind: "runtime-telemetry" },
    ],
    recommendation: "No immediate remediation required.",
  },
];

/** Focused request flow rendered on small viewports instead of the full topology. */
export const FOCUS_FLOW: readonly NodeId[] = ["cdn", "gateway", "app", "postgres"];

/** The node presented as selected in the hero canvas. */
export const SELECTED_NODE_ID: NodeId = "app";

export function getNode(id: NodeId): DemoNode {
  const node = DEMO_NODES.find((candidate) => candidate.id === id);
  if (node === undefined) {
    throw new Error(`Unknown demo architecture node: ${id}`);
  }
  return node;
}

export function findEdge(source: NodeId, target: NodeId): DemoEdge | undefined {
  return DEMO_EDGES.find((edge) => edge.source === source && edge.target === target);
}

/** Example prompt shown in the Prompt to Production demonstration. */
export const DEMO_PROMPT =
  "Design a multi-tenant SaaS platform for financial reporting with authentication, subscription billing, background processing, audit logging, and tenant-isolated data storage. Deploy it on AWS with high availability.";

export interface DemoAssumption {
  id: string;
  label: string;
  value: string;
}

/** Structured architecture inputs derived from the example prompt. */
export const DEMO_ASSUMPTIONS: readonly DemoAssumption[] = [
  { id: "mau", label: "Monthly active users", value: "250,000" },
  { id: "cloud", label: "Deployment", value: "AWS" },
  { id: "isolation", label: "Tenant isolation", value: "Strong" },
  { id: "availability", label: "Availability", value: "Multi-zone" },
  { id: "jobs", label: "Background jobs", value: "Event-driven" },
  { id: "sensitivity", label: "Data sensitivity", value: "Financial" },
  { id: "datastore", label: "Primary datastore", value: "PostgreSQL" },
];

/** Dependency order in which the generation demo reveals the architecture. */
export const GENERATION_ORDER: readonly NodeId[] = [
  "cdn",
  "gateway",
  "auth",
  "app",
  "payments",
  "redis",
  "postgres",
  "rabbitmq",
  "workers",
  "storage",
  "stripe",
  "datadog",
];

export interface GenerationStage {
  id: string;
  label: string;
}

export const GENERATION_STAGES: readonly GenerationStage[] = [
  { id: "parse", label: "Parsing requirements" },
  { id: "resolve", label: "Resolving service dependencies" },
  { id: "groups", label: "Assigning architecture groups" },
  { id: "validate", label: "Validating relationships" },
  { id: "complete", label: "Architecture complete" },
];
