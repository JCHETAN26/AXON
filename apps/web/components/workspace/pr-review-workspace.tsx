"use client";

import { useState } from "react";
import { type ArchitectureProposal } from "@axon/repo-intel";
import { StatusBadge, cx } from "@axon/ui";

export interface PrRunSummary {
  id: string;
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  headSha: string;
  baseSha: string;
  status: string;
  architectureRisk: "critical" | "high" | "medium" | "low" | "none";
  commentPostedAt?: string | null;
  createdAt: string;
}

export interface PullRequestReviewWorkspaceProps {
  repositoryFullName: string;
  runs: PrRunSummary[];
  proposal?: ArchitectureProposal | null;
  onAnalyzePr: (prNumber: number) => Promise<void>;
  onPostComment: (prNumber: number, runId: string) => Promise<void>;
}

export function PullRequestReviewWorkspace({
  repositoryFullName,
  runs,
  proposal,
  onAnalyzePr,
  onPostComment,
}: PullRequestReviewWorkspaceProps) {
  const [selectedPrNumber, setSelectedPrNumber] = useState<number>(
    runs[0]?.prNumber ?? 1
  );
  const [inputPrNumber, setInputPrNumber] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [commenting, setCommenting] = useState(false);

  const selectedRun = runs.find((r) => r.prNumber === selectedPrNumber) ?? runs[0];

  const handleAnalyze = async () => {
    const num = parseInt(inputPrNumber, 10);
    if (isNaN(num)) return;
    setBusy(true);
    try {
      await onAnalyzePr(num);
      setSelectedPrNumber(num);
      setInputPrNumber("");
    } finally {
      setBusy(false);
    }
  };

  const handlePostComment = async () => {
    if (!selectedRun) return;
    setCommenting(true);
    try {
      await onPostComment(selectedRun.prNumber, selectedRun.id);
    } finally {
      setCommenting(false);
    }
  };

  const riskKind =
    selectedRun?.architectureRisk === "critical" || selectedRun?.architectureRisk === "high"
      ? "critical"
      : selectedRun?.architectureRisk === "medium"
      ? "warning"
      : "success";

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-border-strong bg-surface p-4 shadow-sm">
        <div>
          <h2 className="type-headline-md font-bold text-foreground">
            GitHub Pull-Request Architecture Reviews
          </h2>
          <p className="type-mono-data mt-1 text-foreground-muted">
            Repository: <code className="text-accent">{repositoryFullName}</code> · Analyzed PRs: {runs.length}
          </p>
        </div>

        {/* PR Trigger Input */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="PR #"
            value={inputPrNumber}
            onChange={(e) => setInputPrNumber(e.target.value)}
            className="w-24 border-2 border-border bg-surface p-2 type-mono-data text-foreground focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            disabled={busy || !inputPrNumber}
            onClick={handleAnalyze}
            className="type-label-caps bg-primary px-4 py-2 text-primary-foreground transition-all hover:bg-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            {busy ? "ANALYZING..." : "ANALYZE PR"}
          </button>
        </div>
      </div>

      {/* Main Review Layout */}
      <div className="flex flex-col gap-6 xl:flex-row">
        {/* Left Column: PR Analysis History List */}
        <div className="w-full xl:w-96 shrink-0 flex flex-col gap-4">
          <div className="border-2 border-border bg-surface p-4">
            <h3 className="type-label-caps text-foreground-muted">
              Pull Request Runs ({runs.length})
            </h3>

            {runs.length === 0 ? (
              <p className="type-body-md mt-3 border-2 border-dashed border-border p-4 text-foreground-muted">
                No pull requests analyzed yet. Enter a PR number above to analyze architectural impact.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {runs.map((run) => (
                  <li key={run.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedPrNumber(run.prNumber)}
                      className={cx(
                        "flex w-full flex-col items-start gap-1 border-2 p-3 text-left transition-all",
                        run.prNumber === selectedPrNumber
                          ? "border-accent bg-accent-muted/30"
                          : "border-border hover:border-border-strong bg-surface"
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="type-body-md font-bold text-foreground">
                          PR #{run.prNumber}: {run.prTitle}
                        </span>
                        <StatusBadge
                          kind={
                            run.architectureRisk === "critical" || run.architectureRisk === "high"
                              ? "critical"
                              : run.architectureRisk === "medium"
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {run.architectureRisk.toUpperCase()} RISK
                        </StatusBadge>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-foreground-muted">
                        <span className="type-mono-data">Author: @{run.prAuthor}</span>
                        <span className="type-mono-data font-mono">
                          {run.headSha.substring(0, 7)}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column: Selected PR Architecture Review Details */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {selectedRun ? (
            <div className="border-2 border-border-strong bg-surface p-5 flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-border pb-4">
                <div>
                  <h3 className="type-headline-sm font-bold text-foreground">
                    PR #{selectedRun.prNumber}: {selectedRun.prTitle}
                  </h3>
                  <p className="type-mono-data mt-1 text-xs text-foreground-muted">
                    Author: <span className="text-foreground">@{selectedRun.prAuthor}</span> · Base: <code>{selectedRun.baseSha.substring(0, 7)}</code> → Head: <code className="text-accent">{selectedRun.headSha.substring(0, 7)}</code>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge kind={riskKind}>
                    {selectedRun.architectureRisk.toUpperCase()} ARCHITECTURE RISK
                  </StatusBadge>

                  <button
                    type="button"
                    disabled={commenting}
                    onClick={handlePostComment}
                    className="type-label-caps border-2 border-accent bg-accent-muted px-4 py-2 text-foreground transition-all hover:bg-accent hover:text-white"
                  >
                    {commenting
                      ? "POSTING..."
                      : selectedRun.commentPostedAt
                      ? "RE-POST COMMENT TO GITHUB"
                      : "POST COMMENT TO GITHUB"}
                  </button>
                </div>
              </div>

              {/* Proposed Components Catalog */}
              <div>
                <h4 className="type-label-caps text-foreground-muted">
                  Architectural Components ({proposal?.components.length ?? 0})
                </h4>

                {!proposal || proposal.components.length === 0 ? (
                  <p className="type-body-md mt-2 text-xs text-foreground-muted">
                    No structural component changes detected in this pull request.
                  </p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {proposal.components.map((comp) => (
                      <li key={comp.id} className="border-2 border-border p-3 flex items-center justify-between">
                        <div>
                          <span className="type-body-md font-semibold text-foreground">{comp.name}</span>
                          <span className="type-mono-data ml-3 text-xs text-foreground-muted uppercase">
                            {comp.category}
                          </span>
                        </div>
                        <StatusBadge kind="info">{comp.review}</StatusBadge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-border p-8 text-center text-foreground-muted">
              Select or analyze a pull request to inspect its architecture impact.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
