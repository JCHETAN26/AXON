export type ReleaseGateStatus = "passing" | "manual-validation-required" | "blocked";

export type ReleaseClassification =
  | "READY_FOR_PRIVATE_ALPHA"
  | "READY_FOR_LIMITED_BETA"
  | "READY_FOR_GENERAL_AVAILABILITY"
  | "MANUAL_VALIDATION_REQUIRED"
  | "BLOCKED";

export interface ReleaseGate {
  readonly id: string;
  readonly label: string;
  readonly status: ReleaseGateStatus;
  readonly evidence?: string;
  readonly rollback?: string;
}

export interface ReleaseReadinessReport {
  readonly classification: ReleaseClassification;
  readonly passing: readonly ReleaseGate[];
  readonly manualValidationRequired: readonly ReleaseGate[];
  readonly blocked: readonly ReleaseGate[];
  readonly nextAction: string;
}

export interface DefaultReleaseGateInput {
  readonly automatedValidationPassing?: boolean;
  readonly clientBundleSecretScanPassing?: boolean;
  readonly liveGithubAppValidationPassing?: boolean;
  readonly liveTelemetryValidationPassing?: boolean;
  readonly productionDeploymentValidated?: boolean;
  readonly backupRestoreValidated?: boolean;
  readonly billingValidated?: boolean;
  readonly supportProcessValidated?: boolean;
  readonly monitoringAlertingValidated?: boolean;
  readonly securityReviewValidated?: boolean;
}

const GA_REQUIRED_GATES = new Set([
  "production-deployment",
  "security-review",
  "backups-restore",
  "billing-validation",
  "support-process",
  "monitoring-alerting",
  "deletion-export",
  "prompt-loop",
  "github-loop",
  "local-mcp-loop",
  "connected-operations-loop",
  "team-loop",
]);

const PRIVATE_ALPHA_REQUIRED_GATES = new Set(["prompt-loop", "security-review", "deletion-export"]);

const LIMITED_BETA_REQUIRED_GATES = new Set([
  ...PRIVATE_ALPHA_REQUIRED_GATES,
  "github-loop",
  "local-mcp-loop",
  "monitoring-alerting",
]);

function gate(
  input: Omit<ReleaseGate, "status"> & { readonly passing?: boolean | undefined },
): ReleaseGate {
  return {
    id: input.id,
    label: input.label,
    status: input.passing === true ? "passing" : "manual-validation-required",
    ...(input.evidence !== undefined ? { evidence: input.evidence } : {}),
    ...(input.rollback !== undefined ? { rollback: input.rollback } : {}),
  };
}

export function buildDefaultAxonReleaseGates(
  input: DefaultReleaseGateInput = {},
): readonly ReleaseGate[] {
  return [
    gate({
      id: "prompt-loop",
      label: "Prompt-to-architecture loop",
      passing: input.automatedValidationPassing,
      evidence: "Architecture generation, canvas, audit, recommendation, simulation, and workspace tests.",
    }),
    gate({
      id: "security-review",
      label: "Security review",
      passing: input.securityReviewValidated === true && input.clientBundleSecretScanPassing === true,
      evidence: "Requires security review sign-off plus clean client-bundle secret scan.",
    }),
    gate({
      id: "deletion-export",
      label: "Deletion and export lifecycle",
      passing: input.automatedValidationPassing,
      evidence: "Account/project export and deletion automated tests.",
    }),
    gate({
      id: "github-loop",
      label: "GitHub repository and PR loop",
      passing: input.liveGithubAppValidationPassing,
      evidence: "Requires live GitHub App fixture validation; automated repository/PR tests alone are not enough.",
    }),
    gate({
      id: "local-mcp-loop",
      label: "Local MCP loop",
      passing: input.automatedValidationPassing,
      evidence: "MCP stdio transport and local analysis tests.",
    }),
    gate({
      id: "connected-operations-loop",
      label: "Connected cloud and telemetry operations",
      passing: input.liveTelemetryValidationPassing,
      evidence: "Requires live telemetry/cloud connector validation; fixtures do not satisfy this gate.",
    }),
    gate({
      id: "team-loop",
      label: "Team collaboration loop",
      passing: input.automatedValidationPassing,
      evidence: "Share links, comments, approvals, presentation, and copilot workspace tests.",
    }),
    gate({
      id: "production-deployment",
      label: "Production deployment",
      passing: input.productionDeploymentValidated,
      evidence: "Requires production deployment URL and smoke/canary validation.",
    }),
    gate({
      id: "backups-restore",
      label: "Backup and restore",
      passing: input.backupRestoreValidated,
      evidence: "Requires restore drill evidence.",
    }),
    gate({
      id: "billing-validation",
      label: "Billing validation",
      passing: input.billingValidated,
      evidence: "Requires production billing and plan validation.",
    }),
    gate({
      id: "support-process",
      label: "Support process",
      passing: input.supportProcessValidated,
      evidence: "Requires support intake, escalation, and response process validation.",
    }),
    gate({
      id: "monitoring-alerting",
      label: "Monitoring and alerting",
      passing: input.monitoringAlertingValidated,
      evidence: "Requires production monitoring, alert routing, and alert drill validation.",
    }),
  ];
}

export function classifyReleaseReadiness(gates: readonly ReleaseGate[]): ReleaseReadinessReport {
  const passing = gates.filter((gate) => gate.status === "passing");
  const manualValidationRequired = gates.filter(
    (gate) => gate.status === "manual-validation-required",
  );
  const blocked = gates.filter((gate) => gate.status === "blocked");

  if (blocked.length > 0) {
    return {
      classification: "BLOCKED",
      passing,
      manualValidationRequired,
      blocked,
      nextAction: `Resolve blocked gate: ${blocked[0]?.label ?? "unknown gate"}.`,
    };
  }
  if (manualValidationRequired.length > 0) {
    return {
      classification: "MANUAL_VALIDATION_REQUIRED",
      passing,
      manualValidationRequired,
      blocked,
      nextAction: `Complete manual validation gate: ${
        manualValidationRequired[0]?.label ?? "unknown gate"
      }.`,
    };
  }

  const passingIds = new Set(passing.map((gate) => gate.id));
  const gaReady = [...GA_REQUIRED_GATES].every((gateId) => passingIds.has(gateId));
  if (gaReady) {
    return {
      classification: "READY_FOR_GENERAL_AVAILABILITY",
      passing,
      manualValidationRequired,
      blocked,
      nextAction: "Proceed only if leadership approves GA launch evidence.",
    };
  }

  const limitedBetaReady = [...LIMITED_BETA_REQUIRED_GATES].every((gateId) =>
    passingIds.has(gateId),
  );
  if (limitedBetaReady) {
    return {
      classification: "READY_FOR_LIMITED_BETA",
      passing,
      manualValidationRequired,
      blocked,
      nextAction: "Continue staged validation before expanding rollout.",
    };
  }

  const privateAlphaReady = [...PRIVATE_ALPHA_REQUIRED_GATES].every((gateId) =>
    passingIds.has(gateId),
  );
  if (privateAlphaReady) {
    return {
      classification: "READY_FOR_PRIVATE_ALPHA",
      passing,
      manualValidationRequired,
      blocked,
      nextAction: "Continue staged validation before expanding rollout.",
    };
  }

  return {
    classification: "MANUAL_VALIDATION_REQUIRED",
    passing,
    manualValidationRequired,
    blocked,
    nextAction: "Continue staged validation before expanding rollout.",
  };
}
