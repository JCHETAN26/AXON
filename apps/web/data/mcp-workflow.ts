/**
 * Typed model for the Local MCP Workflow demonstration. All values are
 * deterministic mock data for the interactive preview — no real repository is
 * scanned and no realistic secret values appear anywhere.
 */

export type McpBoundary = "local" | "cloud";

export interface McpPipelineStep {
  id: string;
  label: string;
  boundary: McpBoundary;
}

/** The data-flow pipeline rendered as the section's workflow diagram. */
export const MCP_PIPELINE: readonly McpPipelineStep[] = [
  { id: "repo", label: "Local Repository", boundary: "local" },
  { id: "parser", label: "Local Parser", boundary: "local" },
  { id: "redaction", label: "Secret Redaction", boundary: "local" },
  { id: "server", label: "Local MCP Server", boundary: "local" },
  { id: "model", label: "Sanitized Architecture Model", boundary: "local" },
  { id: "studio", label: "AXON Web Studio", boundary: "cloud" },
];

export interface McpScanStage {
  id: string;
  label: string;
  /** Pipeline step that lights up while this stage runs. */
  pipelineStepId: string;
}

/** Interactive scan stages, in execution order. */
export const MCP_SCAN_STAGES: readonly McpScanStage[] = [
  { id: "access", label: "Repository access requested", pipelineStepId: "repo" },
  { id: "discover", label: "Supported files discovered", pipelineStepId: "repo" },
  { id: "parse", label: "Infrastructure parsed locally", pipelineStepId: "parser" },
  { id: "redact", label: "Secrets and sensitive values redacted", pipelineStepId: "redaction" },
  { id: "model", label: "Architecture model generated", pipelineStepId: "model" },
  { id: "approve", label: "User approves synchronization", pipelineStepId: "model" },
  { id: "sync", label: "Sanitized model appears in the web studio", pipelineStepId: "studio" },
];

export const DISCOVERED_FILES: readonly string[] = [
  "docker-compose.yml",
  "infra/main.tf",
  "infra/network.tf",
  "k8s/api-deployment.yaml",
  "k8s/worker-deployment.yaml",
  "openapi.yaml",
  "src/config/database.ts",
];

export interface McpRedaction {
  /** What was found (a key or reference, never a real secret value). */
  source: string;
  /** What the sanitized model contains instead. */
  replacement: string;
}

export const MCP_REDACTIONS: readonly McpRedaction[] = [
  { source: "DATABASE_URL", replacement: "[REDACTED_CONNECTION_STRING]" },
  { source: "STRIPE_SECRET_KEY", replacement: "[REDACTED_SECRET]" },
  { source: "AWS_ACCESS_KEY_ID", replacement: "[REDACTED_CREDENTIAL]" },
  { source: "pg-primary.internal:5432", replacement: "service:postgresql" },
];

export const MCP_COMMANDS: readonly string[] = [
  "npx axon scan .",
  "npx axon audit architecture.json",
  "npx axon simulate --traffic 10x",
];
