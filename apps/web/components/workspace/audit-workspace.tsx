"use client";

import {
  RULESET_VERSION,
  setFindingState,
  type AuditFinding,
  type ProjectAuditState,
} from "@axon/architecture-audit";
import { type ArchitectureDocument } from "@axon/diagram-schema";
import { Button, StatusBadge, cx } from "@axon/ui";
import { useState } from "react";

import { FindingInspector } from "./finding-inspector";
import { getAuditRepository } from "@/lib/audit/get-audit-repository";
import {
  SEVERITY_STATUS_KIND,
  computeNextAuditState,
  getAuditFreshness,
  type AuditFreshness,
} from "@/lib/audit/run-project-audit";

const FRESHNESS_TEXT: Record<AuditFreshness, string> = {
  "never-run": `NEVER_RUN · deterministic ruleset v${RULESET_VERSION}`,
  "up-to-date": `UP_TO_DATE · ruleset v${RULESET_VERSION}`,
  "architecture-changed": "ARCHITECTURE_CHANGED · rerun to refresh findings",
  "ruleset-updated": "RULESET_UPDATED · rerun to refresh findings",
};

const STATE_LABEL: Record<AuditFinding["state"], string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
};

export interface AuditWorkspaceProps {
  document: ArchitectureDocument;
  auditState: ProjectAuditState | null;
  onAuditStateChange: (state: ProjectAuditState) => void;
}

/**
 * Deterministic audit surface: run/rerun, reconciled findings with their
 * lifecycle states, and the evidence inspector. All computation is local and
 * rule-based — nothing here talks to a model or a network.
 */
export function AuditWorkspace({ document, auditState, onAuditStateChange }: AuditWorkspaceProps) {
  const [selectedFingerprint, setSelectedFingerprint] = useState<string | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);

  const freshness = getAuditFreshness(auditState, document);
  const findings = auditState?.findings ?? [];
  const activeFindings = findings.filter((finding) => finding.state !== "resolved");
  const resolvedFindings = findings.filter((finding) => finding.state === "resolved");
  const selectedFinding = findings.find((finding) => finding.fingerprint === selectedFingerprint);

  const persist = async (next: ProjectAuditState) => {
    try {
      await getAuditRepository().saveAuditState(next);
      setPersistError(null);
      onAuditStateChange(next);
    } catch (error) {
      setPersistError(error instanceof Error ? error.message : "Could not save audit locally.");
    }
  };

  const runAuditNow = async () => {
    const next = computeNextAuditState({
      document,
      previous: auditState,
      now: new Date().toISOString(),
    });
    await persist(next);
  };

  const changeFindingState = async (fingerprint: string, nextState: "open" | "acknowledged") => {
    if (auditState === null) return;
    const nextFindings = setFindingState(
      auditState.findings,
      fingerprint,
      nextState,
      new Date().toISOString(),
    );
    if (nextFindings === auditState.findings) return;
    await persist({ ...auditState, findings: [...nextFindings] });
  };

  const findingRow = (finding: AuditFinding) => (
    <li key={finding.fingerprint}>
      <button
        type="button"
        onClick={() => {
          setSelectedFingerprint(finding.fingerprint);
        }}
        aria-pressed={finding.fingerprint === selectedFingerprint}
        className={cx(
          "flex w-full flex-col items-start gap-2 rounded-module border-2 p-3 text-left",
          "focus-visible:outline-2 focus-visible:outline-accent",
          finding.fingerprint === selectedFingerprint
            ? "border-accent bg-accent-muted/40"
            : "border-border bg-surface hover:border-border-strong",
        )}
      >
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge kind={SEVERITY_STATUS_KIND[finding.severity]}>
            {finding.severity}
          </StatusBadge>
          <StatusBadge kind={finding.state === "resolved" ? "success" : "neutral"}>
            {STATE_LABEL[finding.state]}
          </StatusBadge>
        </span>
        <span className="type-body-md font-semibold">{finding.title}</span>
      </button>
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              void runAuditNow();
            }}
          >
            {freshness === "never-run" ? "Run Audit" : "Rerun Audit"}
          </Button>
          <p
            role="status"
            aria-live="polite"
            aria-label="Audit status"
            className={cx(
              "type-mono-data",
              persistError !== null
                ? "text-critical"
                : freshness === "up-to-date" || freshness === "never-run"
                  ? "text-foreground-muted"
                  : "text-warning",
            )}
          >
            {persistError !== null
              ? `AUDIT_SAVE_FAILED · ${persistError}`
              : FRESHNESS_TEXT[freshness]}
          </p>
        </div>
        <p className="type-mono-data text-foreground-muted">
          Structural analysis of the architecture document · no runtime data, no AI
        </p>
      </div>

      {auditState === null ? (
        <div className="border-2 border-dashed border-border-strong p-8">
          <p className="type-body-lg">This project has not been audited yet.</p>
          <p className="type-body-md mt-2 text-foreground-muted">
            AXON runs versioned deterministic rules against the current architecture document and
            reports structural risks with the evidence behind each one.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 xl:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <section aria-label="Findings">
              <h2 className="type-label-caps text-foreground-muted">
                Findings ({activeFindings.length})
              </h2>
              {activeFindings.length === 0 ? (
                <p className="type-body-md mt-3 text-foreground-muted">
                  No open structural findings in the current architecture document under ruleset v
                  {RULESET_VERSION}.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">{activeFindings.map(findingRow)}</ul>
              )}
            </section>

            {resolvedFindings.length > 0 && (
              <section aria-label="Resolved findings">
                <h2 className="type-label-caps text-foreground-muted">
                  Resolved ({resolvedFindings.length})
                </h2>
                <ul className="mt-3 flex flex-col gap-2">{resolvedFindings.map(findingRow)}</ul>
              </section>
            )}
          </div>

          <aside
            aria-label="Finding inspector"
            className="w-full shrink-0 border-2 border-border-strong bg-surface p-5 xl:w-[26rem]"
          >
            {selectedFinding !== undefined ? (
              <FindingInspector
                finding={selectedFinding}
                document={document}
                onAcknowledge={() => {
                  void changeFindingState(selectedFinding.fingerprint, "acknowledged");
                }}
                onReopen={() => {
                  void changeFindingState(selectedFinding.fingerprint, "open");
                }}
              />
            ) : (
              <div className="flex flex-col gap-3">
                <p className="type-label-caps text-foreground-muted">Finding inspector</p>
                <p className="type-body-md text-foreground-muted">
                  Select a finding to see what was detected, the evidence, what AXON inferred, and
                  the limitation of the rule that produced it.
                </p>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
