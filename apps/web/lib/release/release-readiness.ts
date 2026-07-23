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
