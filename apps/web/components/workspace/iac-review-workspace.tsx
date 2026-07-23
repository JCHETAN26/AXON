"use client";

import { useState } from "react";
import { type ArchitectureProposal, type ProposalComponent } from "@axon/repo-intel";
import { type ArchitectureDocument } from "@axon/diagram-schema";
import { StatusBadge, cx } from "@axon/ui";
import { ReadOnlyArchitectureCanvas } from "@/components/canvas/read-only-architecture-canvas";

export interface IaCReviewWorkspaceProps {
  projectId: string;
  document: ArchitectureDocument;
  proposal: ArchitectureProposal;
  onApplyProposal: (reviewedProposal: ArchitectureProposal) => void;
}

type ViewTab = "proposed" | "current" | "diff";

export function IaCReviewWorkspace({
  document,
  proposal,
  onApplyProposal,
}: IaCReviewWorkspaceProps) {
  const [currentProposal, setCurrentProposal] = useState<ArchitectureProposal>(proposal);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    proposal.components[0]?.id ?? null
  );
  const [viewTab, setViewTab] = useState<ViewTab>("proposed");
  const [busy, setBusy] = useState(false);

  const selectedComponent = currentProposal.components.find((c) => c.id === selectedComponentId);

  const handleComponentReviewChange = (componentId: string, review: ProposalComponent["review"]) => {
    setCurrentProposal((prev) => ({
      ...prev,
      components: prev.components.map((c) => (c.id === componentId ? { ...c, review } : c)),
    }));
  };

  const handleCategoryChange = (componentId: string, category: ProposalComponent["category"]) => {
    setCurrentProposal((prev) => ({
      ...prev,
      components: prev.components.map((c) => (c.id === componentId ? { ...c, category } : c)),
    }));
  };

  const handleApply = async () => {
    setBusy(true);
    try {
      await onApplyProposal(currentProposal);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Spatial Blueprint Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-border-strong bg-surface p-4 shadow-sm">
        <div>
          <h2 className="type-headline-md font-bold text-foreground">
            IaC & Repository Architecture Proposal
          </h2>
          <p className="type-mono-data mt-1 text-foreground-muted">
            Commit: <code className="text-accent">{currentProposal.sourceCommitSha}</code> · Repository: {currentProposal.sourceRepositoryFullName}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge kind={currentProposal.conflicts.length > 0 ? "critical" : "success"}>
            {currentProposal.conflicts.length} Conflicts
          </StatusBadge>
          <StatusBadge kind={currentProposal.unresolved.length > 0 ? "warning" : "info"}>
            {currentProposal.unresolved.length} Unresolved
          </StatusBadge>
          <button
            type="button"
            disabled={busy}
            onClick={handleApply}
            className="type-label-caps bg-primary px-4 py-2 text-primary-foreground transition-all hover:bg-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            {busy ? "APPLYING..." : "APPLY REVIEWED PROPOSAL"}
          </button>
        </div>
      </div>

      {/* Main Review Grid */}
      <div className="flex flex-col gap-6 xl:flex-row">
        {/* Left Column: Component & Relationship Catalog */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="border-2 border-border bg-surface p-4">
            <h3 className="type-label-caps text-foreground-muted">
              Proposed Components ({currentProposal.components.length})
            </h3>

            <ul className="mt-3 flex flex-col gap-2">
              {currentProposal.components.map((component) => (
                <li key={component.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedComponentId(component.id)}
                    className={cx(
                      "flex w-full flex-col items-start gap-1 border-2 p-3 text-left transition-all",
                      component.id === selectedComponentId
                        ? "border-accent bg-accent-muted/30"
                        : "border-border hover:border-border-strong bg-surface"
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="type-body-md font-semibold text-foreground">
                        {component.name}
                      </span>
                      <StatusBadge
                        kind={
                          component.review === "accepted"
                            ? "success"
                            : component.review === "rejected"
                            ? "critical"
                            : "neutral"
                        }
                      >
                        {component.review}
                      </StatusBadge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-foreground-muted">
                      <span className="type-mono-data uppercase">{component.category}</span>
                      {component.technology && (
                        <span className="type-mono-data text-accent font-mono">
                          {component.technology}
                        </span>
                      )}
                      <span className="type-mono-data font-mono">
                        {component.evidenceIds.length} Evidence
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* View Tab Selector & Canvas */}
          <div className="border-2 border-border bg-surface p-4">
            <div className="flex items-center justify-between border-b-2 border-border pb-3">
              <div role="tablist" className="flex gap-2">
                {(["proposed", "current", "diff"] as ViewTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={viewTab === tab}
                    onClick={() => setViewTab(tab)}
                    className={cx(
                      "type-label-caps border-2 px-3 py-1.5 transition-all",
                      viewTab === tab
                        ? "border-accent bg-accent-muted text-foreground"
                        : "border-border text-foreground-muted hover:border-border-strong"
                    )}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>
              <p className="type-mono-data text-xs text-foreground-muted">
                Spatial Blueprint Grid
              </p>
            </div>

            <div className="mt-4">
              <ReadOnlyArchitectureCanvas
                document={document}
                label={`${viewTab.toUpperCase()} Architecture Blueprint`}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Selected Component Inspector & Decision Panel */}
        <aside className="w-full shrink-0 border-2 border-border-strong bg-surface p-5 xl:w-[26rem]">
          {selectedComponent ? (
            <div className="flex flex-col gap-4">
              <div className="border-b-2 border-border pb-3">
                <h3 className="type-body-lg font-bold text-foreground">
                  {selectedComponent.name}
                </h3>
                <p className="type-mono-data text-xs text-foreground-muted">
                  ID: {selectedComponent.id}
                </p>
              </div>

              <div>
                <span className="type-label-caps text-foreground-muted">Review Decision</span>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleComponentReviewChange(selectedComponent.id, "accepted")}
                    className={cx(
                      "type-label-caps flex-1 border-2 py-2 text-center transition-all",
                      selectedComponent.review === "accepted"
                        ? "border-success bg-success-muted text-success"
                        : "border-border hover:border-border-strong"
                    )}
                  >
                    ACCEPT
                  </button>
                  <button
                    type="button"
                    onClick={() => handleComponentReviewChange(selectedComponent.id, "rejected")}
                    className={cx(
                      "type-label-caps flex-1 border-2 py-2 text-center transition-all",
                      selectedComponent.review === "rejected"
                        ? "border-critical bg-critical-muted text-critical"
                        : "border-border hover:border-border-strong"
                    )}
                  >
                    REJECT
                  </button>
                  <button
                    type="button"
                    onClick={() => handleComponentReviewChange(selectedComponent.id, "proposed")}
                    className={cx(
                      "type-label-caps flex-1 border-2 py-2 text-center transition-all",
                      selectedComponent.review === "proposed"
                        ? "border-accent bg-accent-muted text-accent"
                        : "border-border hover:border-border-strong"
                    )}
                  >
                    PENDING
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="logical-category-select" className="type-label-caps text-foreground-muted">
                  Logical Category
                </label>
                <select
                  id="logical-category-select"
                  value={selectedComponent.category}
                  onChange={(e) =>
                    handleCategoryChange(
                      selectedComponent.id,
                      e.target.value as ProposalComponent["category"]
                    )
                  }
                  className="mt-2 w-full border-2 border-border bg-surface p-2 type-mono-data text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="compute">compute</option>
                  <option value="database">database</option>
                  <option value="storage">storage</option>
                  <option value="queue">queue</option>
                  <option value="network">network</option>
                  <option value="load-balancer">load-balancer</option>
                  <option value="cache">cache</option>
                  <option value="orchestrator">orchestrator</option>
                  <option value="security">security</option>
                  <option value="service">service</option>
                  <option value="unknown">unknown</option>
                </select>
              </div>

              <div>
                <h4 className="type-label-caps text-foreground-muted">Evidence References</h4>
                <ul className="mt-2 flex flex-col gap-2">
                  {selectedComponent.evidenceIds.map((id) => (
                    <li key={id} className="type-mono-data border border-border p-2 text-xs bg-surface-muted">
                      Evidence ID: {id}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="type-body-md text-foreground-muted">
              Select a component to inspect evidence details and review decisions.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
