"use client";

import { useState } from "react";
import { type ArchitectureDocument } from "@axon/diagram-schema";
import { type AwsToGcpMigrationResult, transformAwsToGcp } from "@axon/repo-intel";
import { StatusBadge } from "@axon/ui";

export interface AwsToGcpMigrationWorkspaceProps {
  projectId: string;
  document: ArchitectureDocument;
  onApplyTargetProposal: (result: AwsToGcpMigrationResult) => Promise<void>;
}

export function AwsToGcpMigrationWorkspace({
  document,
  onApplyTargetProposal,
}: AwsToGcpMigrationWorkspaceProps) {
  const [migrationResult, setMigrationResult] = useState<AwsToGcpMigrationResult>(() =>
    transformAwsToGcp(document)
  );
  const [busy, setBusy] = useState(false);

  const handleRecalculate = () => {
    setMigrationResult(transformAwsToGcp(document));
  };

  const handleApply = async () => {
    setBusy(true);
    try {
      await onApplyTargetProposal(migrationResult);
    } finally {
      setBusy(false);
    }
  };

  const { targetProposal, mappedComponentsCount, unmappedComponentsCount, averageEquivalenceScore, residualRisks } =
    migrationResult;

  const scorePct = Math.round(averageEquivalenceScore * 100);

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Spatial Blueprint Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-border-strong bg-surface p-4 shadow-sm">
        <div>
          <h2 className="type-headline-md font-bold text-foreground">
            AWS to GCP Infrastructure Migration Workspace
          </h2>
          <p className="type-mono-data mt-1 text-foreground-muted">
            Source Architecture: <span className="text-accent">{document.name}</span> · Direct Equivalence Score: <strong className="text-success">{scorePct}%</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRecalculate}
            className="type-label-caps border-2 border-border px-3 py-2 text-foreground-muted transition-all hover:border-border-strong"
          >
            RE-EVALUATE
          </button>

          <button
            type="button"
            disabled={busy || targetProposal.components.length === 0}
            onClick={handleApply}
            className="type-label-caps bg-primary px-4 py-2 text-primary-foreground transition-all hover:bg-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            {busy ? "APPLYING MIGRATION..." : "APPLY GCP TARGET ARCHITECTURE"}
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border-2 border-border bg-surface p-4">
          <p className="type-label-caps text-foreground-muted">Mapped Components</p>
          <p className="type-headline-lg font-bold text-foreground mt-1">{mappedComponentsCount}</p>
        </div>
        <div className="border-2 border-border bg-surface p-4">
          <p className="type-label-caps text-foreground-muted">Custom Fallbacks</p>
          <p className="type-headline-lg font-bold text-warning mt-1">{unmappedComponentsCount}</p>
        </div>
        <div className="border-2 border-border bg-surface p-4">
          <p className="type-label-caps text-foreground-muted">Equivalence Score</p>
          <p className="type-headline-lg font-bold text-success mt-1">{scorePct}%</p>
        </div>
        <div className="border-2 border-border bg-surface p-4">
          <p className="type-label-caps text-foreground-muted">Refactoring Caveats</p>
          <p className="type-headline-lg font-bold text-accent mt-1">{residualRisks.length}</p>
        </div>
      </div>

      {/* Main Component Mapping Layout */}
      <div className="flex flex-col gap-6 xl:flex-row">
        {/* Component Mappings Catalog */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="border-2 border-border bg-surface p-4">
            <h3 className="type-label-caps text-foreground-muted">
              AWS → GCP Target Component Mappings ({targetProposal.components.length})
            </h3>

            <ul className="mt-4 flex flex-col gap-3">
              {targetProposal.components.map((gcpComp) => {
                const originalNode = document.nodes.find((n) => `gcp-${n.id}` === gcpComp.id);

                return (
                  <li key={gcpComp.id} className="border-2 border-border p-4 flex flex-col gap-2 bg-surface">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="type-body-md font-semibold text-foreground">
                          {originalNode?.name ?? gcpComp.name}
                        </span>
                        <span className="type-mono-data text-xs text-foreground-muted font-mono">
                          ({originalNode?.meta ?? "aws_resource"})
                        </span>
                      </div>

                      <span className="type-mono-data text-accent">→</span>

                      <div className="flex items-center gap-3">
                        <span className="type-body-md font-bold text-foreground">
                          {gcpComp.name}
                        </span>
                        <StatusBadge kind={gcpComp.confidence === "high" ? "success" : "warning"}>
                          {gcpComp.technology}
                        </StatusBadge>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Residual Risks & Refactoring Advisories */}
        <aside className="w-full shrink-0 border-2 border-border-strong bg-surface p-5 xl:w-[26rem]">
          <h3 className="type-label-caps text-foreground-muted border-b-2 border-border pb-3">
            Refactoring Advisories & Residual Risks ({residualRisks.length})
          </h3>

          {residualRisks.length === 0 ? (
            <p className="type-body-md mt-4 text-xs text-foreground-muted">
              No manual refactoring advisories identified.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {residualRisks.map((risk, i) => (
                <li key={i} className="border border-border p-3 text-xs type-mono-data text-foreground-muted bg-surface-muted">
                  ⚠️ {risk}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
