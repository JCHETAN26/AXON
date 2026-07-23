"use client";

import { useState } from "react";
import { type ArchitectureProposal, generateInfrastructureCode } from "@axon/repo-intel";
import { StatusBadge, cx } from "@axon/ui";

export interface ControlledPrItem {
  id: string;
  prNumber: number;
  prUrl: string;
  branchName: string;
  targetBranch: string;
  status: string;
  createdAt: string;
}

export interface ControlledInfrastructurePrWorkspaceProps {
  repositoryFullName: string;
  proposal: ArchitectureProposal;
  proposalId: string;
  existingPrs: ControlledPrItem[];
  onSubmitPr: (targetBranch: string) => Promise<void>;
}

type CodeTab = "hcl" | "yaml";

export function ControlledInfrastructurePrWorkspace({
  repositoryFullName,
  proposal,
  existingPrs,
  onSubmitPr,
}: ControlledInfrastructurePrWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<CodeTab>("hcl");
  const [targetBranch, setTargetBranch] = useState("main");
  const [submitting, setSubmitting] = useState(false);

  const generated = generateInfrastructureCode(proposal);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmitPr(targetBranch);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Spatial Blueprint Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-border-strong bg-surface p-4 shadow-sm">
        <div>
          <h2 className="type-headline-md font-bold text-foreground">
            Controlled Infrastructure-as-Code Pull Request Generator
          </h2>
          <p className="type-mono-data mt-1 text-foreground-muted">
            Repository: <span className="text-accent">{repositoryFullName}</span> · Controlled PRs: {existingPrs.length}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="type-label-caps inline-flex items-center gap-1.5 rounded-control border border-success bg-success-muted px-2.5 py-1 text-success text-xs font-mono">
            NON-EXECUTING · MANUAL HUMAN MERGE REQUIRED
          </span>

          <button
            type="button"
            disabled={submitting || proposal.components.length === 0}
            onClick={handleSubmit}
            className="type-label-caps bg-primary px-4 py-2 text-primary-foreground transition-all hover:bg-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            {submitting ? "SUBMITTING TO GITHUB..." : "OPEN INFRASTRUCTURE PULL REQUEST ON GITHUB"}
          </button>
        </div>
      </div>

      {/* Main Code Preview & Settings Layout */}
      <div className="flex flex-col gap-6 xl:flex-row">
        {/* Left Column: HCL/YAML Code Tab Previews */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="border-2 border-border bg-surface p-4">
            <div className="flex items-center justify-between border-b-2 border-border pb-3">
              <div role="tablist" className="flex gap-2">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "hcl"}
                  onClick={() => setActiveTab("hcl")}
                  className={cx(
                    "type-label-caps border-2 px-3 py-1.5 transition-all",
                    activeTab === "hcl"
                      ? "border-accent bg-accent-muted text-foreground"
                      : "border-border text-foreground-muted hover:border-border-strong"
                  )}
                >
                  TERRAFORM HCL (main.tf)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "yaml"}
                  onClick={() => setActiveTab("yaml")}
                  className={cx(
                    "type-label-caps border-2 px-3 py-1.5 transition-all",
                    activeTab === "yaml"
                      ? "border-accent bg-accent-muted text-foreground"
                      : "border-border text-foreground-muted hover:border-border-strong"
                  )}
                >
                  KUBERNETES YAML (deployment.yaml)
                </button>
              </div>
            </div>

            <div className="mt-4 border-2 border-border bg-surface-muted p-4 overflow-x-auto">
              <pre className="type-mono-data text-xs text-foreground font-mono leading-relaxed whitespace-pre font-normal">
                {activeTab === "hcl" ? generated.terraformHcl : generated.kubernetesYaml}
              </pre>
            </div>
          </div>
        </div>

        {/* Right Column: Settings & PR History */}
        <aside className="w-full shrink-0 border-2 border-border-strong bg-surface p-5 xl:w-96 flex flex-col gap-5">
          <div>
            <h3 className="type-label-caps text-foreground-muted border-b-2 border-border pb-3">
              Target Branch & Safety Check
            </h3>

            <div className="mt-3">
              <label htmlFor="target-branch-select" className="type-mono-data text-xs text-foreground-muted">
                Target Git Branch
              </label>
              <select
                id="target-branch-select"
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                className="mt-1 w-full border-2 border-border bg-surface p-2 type-mono-data text-foreground"
              >
                <option value="main">main</option>
                <option value="master">master</option>
                <option value="develop">develop</option>
              </select>
            </div>

            <div className="mt-4 border border-border p-3 bg-surface-muted text-xs type-mono-data text-foreground-muted">
              🔒 AXON will open a pull request on branch <code className="text-accent">axon/infra-update-*</code>. Infrastructure state is never applied automatically.
            </div>
          </div>

          {/* History of Submitted Controlled PRs */}
          <div>
            <h3 className="type-label-caps text-foreground-muted border-b-2 border-border pb-3">
              Submitted Controlled PRs ({existingPrs.length})
            </h3>

            {existingPrs.length === 0 ? (
              <p className="type-body-md mt-3 text-xs text-foreground-muted">
                No controlled infrastructure PRs created yet for this proposal.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {existingPrs.map((pr) => (
                  <li key={pr.id} className="border-2 border-border p-3 flex flex-col gap-1 bg-surface">
                    <div className="flex items-center justify-between">
                      <a
                        href={pr.prUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="type-body-md font-bold text-accent hover:underline"
                      >
                        PR #{pr.prNumber}
                      </a>
                      <StatusBadge kind="success">{pr.status}</StatusBadge>
                    </div>
                    <span className="type-mono-data text-xs text-foreground-muted font-mono">
                      Branch: {pr.branchName} → {pr.targetBranch}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
