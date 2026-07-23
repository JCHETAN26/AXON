import { describe, expect, it } from "vitest";

import {
  buildDefaultAxonReleaseGates,
  classifyReleaseReadiness,
  type ReleaseGate,
} from "./release-readiness";

const GA_GATES: ReleaseGate[] = [
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
].map((id) => ({
  id,
  label: id,
  status: "passing",
}));

describe("classifyReleaseReadiness", () => {
  it("blocks release when any gate is blocked", () => {
    const report = classifyReleaseReadiness([
      ...GA_GATES,
      { id: "oauth", label: "Production OAuth", status: "blocked" },
    ]);
    expect(report.classification).toBe("BLOCKED");
    expect(report.nextAction).toContain("Production OAuth");
  });

  it("requires manual validation before readiness classifications", () => {
    const report = classifyReleaseReadiness([
      ...GA_GATES,
      { id: "dns", label: "DNS switch", status: "manual-validation-required" },
    ]);
    expect(report.classification).toBe("MANUAL_VALIDATION_REQUIRED");
    expect(report.nextAction).toContain("DNS switch");
  });

  it("does not classify GA unless every GA gate has evidence", () => {
    const report = classifyReleaseReadiness(
      GA_GATES.filter((gate) => gate.id !== "billing-validation"),
    );
    expect(report.classification).not.toBe("READY_FOR_GENERAL_AVAILABILITY");
    expect(report.classification).toBe("READY_FOR_LIMITED_BETA");
  });

  it("classifies general availability only when all required gates pass", () => {
    expect(classifyReleaseReadiness(GA_GATES).classification).toBe(
      "READY_FOR_GENERAL_AVAILABILITY",
    );
  });

  it("keeps release in manual validation when staged evidence is insufficient", () => {
    const report = classifyReleaseReadiness([
      { id: "prompt-loop", label: "Prompt loop", status: "passing" },
      { id: "security-review", label: "Security review", status: "passing" },
    ]);
    expect(report.classification).toBe("MANUAL_VALIDATION_REQUIRED");
  });
});

describe("buildDefaultAxonReleaseGates", () => {
  it("keeps AXON in manual validation when only automated validation is known", () => {
    const gates = buildDefaultAxonReleaseGates({
      automatedValidationPassing: true,
      clientBundleSecretScanPassing: true,
    });
    const report = classifyReleaseReadiness(gates);

    expect(report.classification).toBe("MANUAL_VALIDATION_REQUIRED");
    expect(report.passing.map((item) => item.id)).toEqual(
      expect.arrayContaining(["prompt-loop", "deletion-export", "local-mcp-loop", "team-loop"]),
    );
    expect(report.manualValidationRequired.map((item) => item.id)).toEqual(
      expect.arrayContaining(["github-loop", "production-deployment", "monitoring-alerting"]),
    );
  });

  it("classifies GA only when all default live and manual gates pass", () => {
    const gates = buildDefaultAxonReleaseGates({
      automatedValidationPassing: true,
      clientBundleSecretScanPassing: true,
      liveGithubAppValidationPassing: true,
      liveTelemetryValidationPassing: true,
      productionDeploymentValidated: true,
      backupRestoreValidated: true,
      billingValidated: true,
      supportProcessValidated: true,
      monitoringAlertingValidated: true,
      securityReviewValidated: true,
    });

    expect(classifyReleaseReadiness(gates).classification).toBe(
      "READY_FOR_GENERAL_AVAILABILITY",
    );
  });
});
