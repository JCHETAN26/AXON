"use client";

import { type ProjectAuditState } from "@axon/architecture-audit";
import {
  computeDocumentDiff,
  evaluateApplicability,
  generateRecommendations,
  previewPatch,
  type DocumentDiff,
  type ProjectRecommendationState,
  type Recommendation,
} from "@axon/architecture-recommendations";
import { type ArchitectureDocument } from "@axon/diagram-schema";
import { StatusBadge, cx } from "@axon/ui";
import { useMemo, useState } from "react";

import { ApplyApprovalDialog } from "./apply-approval-dialog";
import { ChangeInspector } from "./change-inspector";
import { DiffOverlayProvider } from "@/components/canvas/diff-overlay-context";
import { ReadOnlyArchitectureCanvas } from "@/components/canvas/read-only-architecture-canvas";
import { getProjectRepository } from "@/lib/projects/get-repository";
import { type ProjectWithDocument } from "@/lib/projects/repository";
import { getRecommendationRepository } from "@/lib/recommendations/get-recommendation-repository";
import {
  applyRecommendation,
  isAuditStale,
  wasApplied,
} from "@/lib/recommendations/apply-recommendation";

type ViewMode = "current" | "recommended" | "diff";

const VIEW_LABEL: Record<ViewMode, string> = {
  current: "Current",
  recommended: "Recommended",
  diff: "Diff",
};

const VIEWS: readonly ViewMode[] = ["current", "recommended", "diff"];

export interface RecommendationWorkspaceProps {
  projectId: string;
  document: ArchitectureDocument;
  auditState: ProjectAuditState | null;
  recommendationState: ProjectRecommendationState | null;
  onApplied: (saved: ProjectWithDocument, state: ProjectRecommendationState) => void;
}

/**
 * Current / Recommended / Diff workspace. Recommendations are derived from
 * persisted audit findings; previewing is pure and never writes, and applying
 * requires explicit approval.
 */
export function RecommendationWorkspace({
  projectId,
  document,
  auditState,
  recommendationState,
  onApplied,
}: RecommendationWorkspaceProps) {
  const [selectedFingerprint, setSelectedFingerprint] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("current");
  const [pendingApproval, setPendingApproval] = useState<Recommendation | null>(null);
  const [busy, setBusy] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const auditStale = isAuditStale(auditState, document);

  const recommendations = useMemo(
    () => generateRecommendations({ document, findings: auditState?.findings ?? [] }),
    [document, auditState],
  );

  const selected = recommendations.find((item) => item.fingerprint === selectedFingerprint);

  // Preview is computed, never persisted.
  const preview = useMemo(() => {
    if (selected === undefined || selected.operations.length === 0) return null;
    const result = previewPatch(
      document,
      selected.operations.map((item) => item.operation),
      document.updatedAt,
    );
    return result.ok ? result.document : null;
  }, [document, selected]);

  const diff: DocumentDiff | null = useMemo(
    () => (preview === null ? null : computeDocumentDiff(document, preview)),
    [document, preview],
  );

  const applicability =
    selected === undefined
      ? null
      : evaluateApplicability({
          recommendation: selected,
          document,
          auditIsStale: auditStale,
          alreadyApplied: wasApplied(recommendationState, selected),
        });

  const confirmApply = async () => {
    if (pendingApproval === null) return;
    setBusy(true);
    const result = await applyRecommendation({
      recommendation: pendingApproval,
      projectId,
      document,
      auditState,
      recommendationState,
      projectRepository: getProjectRepository(),
      recommendationRepository: getRecommendationRepository(),
      now: new Date().toISOString(),
    });
    setBusy(false);
    setPendingApproval(null);
    if (result.ok) {
      setApplyError(null);
      setView("current");
      onApplied(result.saved, result.recommendationState);
    } else {
      setApplyError(result.reasons.join(" "));
    }
  };

  if (auditState === null) {
    return (
      <div className="border-2 border-dashed border-border-strong p-8">
        <p className="type-body-lg">No audit findings yet.</p>
        <p className="type-body-md mt-2 text-foreground-muted">
          Recommendations are derived from audit findings. Run an audit first, then AXON can propose
          architecture-document changes with the evidence behind each one.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          role="status"
          aria-live="polite"
          aria-label="Recommendation status"
          className={cx("type-mono-data", auditStale ? "text-warning" : "text-foreground-muted")}
        >
          {applyError !== null
            ? `APPLY_FAILED · ${applyError}`
            : auditStale
              ? "AUDIT_STALE · rerun the audit before applying changes"
              : `${recommendations.length} recommendation${recommendations.length === 1 ? "" : "s"} from the current audit`}
        </p>
        <p className="type-mono-data text-foreground-muted">
          Preview only · updates the AXON architecture model
        </p>
      </div>

      {recommendations.length === 0 ? (
        <div className="border-2 border-dashed border-border-strong p-8">
          <p className="type-body-lg">No recommendations available.</p>
          <p className="type-body-md mt-2 text-foreground-muted">
            Either the audit found nothing actionable, or the open findings need engineering
            decisions AXON does not make automatically.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 xl:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <section aria-label="Recommendations">
              <h2 className="type-label-caps text-foreground-muted">
                Recommendations ({recommendations.length})
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {recommendations.map((recommendation) => (
                  <li key={recommendation.fingerprint}>
                    <button
                      type="button"
                      aria-pressed={recommendation.fingerprint === selectedFingerprint}
                      onClick={() => {
                        setSelectedFingerprint(recommendation.fingerprint);
                        setApplyError(null);
                      }}
                      className={cx(
                        "flex w-full flex-col items-start gap-2 rounded-module border-2 p-3 text-left",
                        "focus-visible:outline-2 focus-visible:outline-accent",
                        recommendation.fingerprint === selectedFingerprint
                          ? "border-accent bg-accent-muted/40"
                          : "border-border bg-surface hover:border-border-strong",
                      )}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          kind={recommendation.mode === "automatic" ? "info" : "neutral"}
                        >
                          {recommendation.mode === "automatic" ? "Automatic" : "Manual review"}
                        </StatusBadge>
                        {wasApplied(recommendationState, recommendation) && (
                          <StatusBadge kind="success">Applied</StatusBadge>
                        )}
                      </span>
                      <span className="type-body-md font-semibold">{recommendation.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Architecture comparison">
              <div role="tablist" aria-label="Comparison view" className="flex flex-wrap gap-2">
                {VIEWS.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={view === mode}
                    onClick={() => {
                      setView(mode);
                    }}
                    className={cx(
                      "type-label-caps border-2 px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-accent",
                      view === mode
                        ? "border-accent bg-accent-muted text-foreground"
                        : "border-border text-foreground-muted hover:border-border-strong",
                    )}
                  >
                    {VIEW_LABEL[mode]}
                  </button>
                ))}
              </div>

              <div className="mt-3">
                {view === "current" && (
                  <ReadOnlyArchitectureCanvas document={document} label="Current architecture" />
                )}
                {view === "recommended" &&
                  (preview === null ? (
                    <p className="type-body-md border-2 border-dashed border-border-strong p-6 text-foreground-muted">
                      Select a recommendation with an automatic change to preview the recommended
                      architecture.
                    </p>
                  ) : (
                    <ReadOnlyArchitectureCanvas
                      document={preview}
                      label="Recommended architecture"
                    />
                  ))}
                {view === "diff" &&
                  (diff === null ? (
                    <p className="type-body-md border-2 border-dashed border-border-strong p-6 text-foreground-muted">
                      Select a recommendation with an automatic change to see the diff.
                    </p>
                  ) : (
                    <>
                      <p className="type-mono-data mb-2 text-foreground-muted">
                        {diff.addedCount} added · {diff.modifiedCount} modified ·{" "}
                        {diff.removedCount} removed
                      </p>
                      <DiffOverlayProvider nodeStates={diff.nodeStates}>
                        <ReadOnlyArchitectureCanvas
                          document={preview ?? document}
                          label="Architecture diff"
                        />
                      </DiffOverlayProvider>
                    </>
                  ))}
              </div>
            </section>
          </div>

          <aside
            aria-label="Change inspector"
            className="w-full shrink-0 border-2 border-border-strong bg-surface p-5 xl:w-[26rem]"
          >
            {selected !== undefined && applicability !== null ? (
              <ChangeInspector
                recommendation={selected}
                applicability={applicability}
                finding={auditState.findings.find(
                  (item) => item.fingerprint === selected.findingFingerprint,
                )}
                diff={diff}
                onRequestApply={() => {
                  setPendingApproval(selected);
                }}
              />
            ) : (
              <div className="flex flex-col gap-3">
                <p className="type-label-caps text-foreground-muted">Change inspector</p>
                <p className="type-body-md text-foreground-muted">
                  Select a recommendation to see which finding triggered it, what would change, and
                  whether AXON can apply it safely.
                </p>
              </div>
            )}
          </aside>
        </div>
      )}

      {pendingApproval !== null && diff !== null && (
        <ApplyApprovalDialog
          recommendation={pendingApproval}
          diff={diff}
          busy={busy}
          onConfirm={() => {
            void confirmApply();
          }}
          onCancel={() => {
            setPendingApproval(null);
          }}
        />
      )}
    </div>
  );
}
