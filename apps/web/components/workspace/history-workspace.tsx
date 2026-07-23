"use client";

import { useState } from "react";
import { 
  type ArchitectureDocument, 
  type ArchitectureSnapshot, 
  type ArchitectureDrift,
  computeSemanticDocumentDiff,
  type SemanticDiffResult
} from "@axon/diagram-schema";
import { StatusBadge, cx } from "@axon/ui";
import { ReadOnlyArchitectureCanvas } from "@/components/canvas/read-only-architecture-canvas";

export interface HistoryWorkspaceProps {
  projectId: string;
  document: ArchitectureDocument;
  snapshots: ArchitectureSnapshot[];
  driftItems: ArchitectureDrift[];
  onRestoreSnapshot: (snapshotId: string) => void;
  onResolveDrift: (driftId: string, decision: "accepted" | "rejected" | "acknowledged") => void;
}

export function HistoryWorkspace({
  document,
  snapshots,
  driftItems,
  onRestoreSnapshot,
  onResolveDrift,
}: HistoryWorkspaceProps) {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(
    snapshots[0]?.id ?? null
  );
  const [comparedSnapshotId, setComparedSnapshotId] = useState<string | null>(
    snapshots[1]?.id ?? null
  );
  const [busy, setBusy] = useState(false);

  const selectedSnapshot = snapshots.find((s) => s.id === selectedSnapshotId);
  const comparedSnapshot = snapshots.find((s) => s.id === comparedSnapshotId);

  const selectedDoc = (selectedSnapshot?.payload as unknown as ArchitectureDocument) ?? document;
  const comparedDoc = (comparedSnapshot?.payload as unknown as ArchitectureDocument) ?? document;

  const diffResult: SemanticDiffResult | null =
    selectedSnapshot && comparedSnapshot
      ? computeSemanticDocumentDiff(comparedDoc, selectedDoc)
      : null;

  const handleRestore = async (id: string) => {
    setBusy(true);
    try {
      await onRestoreSnapshot(id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-border-strong bg-surface p-4 shadow-sm">
        <div>
          <h2 className="type-headline-md font-bold text-foreground">
            Architecture History & Drift Ledger
          </h2>
          <p className="type-mono-data mt-1 text-foreground-muted">
            Immutable Snapshots: <span className="text-accent">{snapshots.length}</span> · Detected Drift Items: {driftItems.length}
          </p>
        </div>

        {selectedSnapshot && (
          <button
            type="button"
            disabled={busy}
            onClick={() => handleRestore(selectedSnapshot.id)}
            className="type-label-caps bg-primary px-4 py-2 text-primary-foreground transition-all hover:bg-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            {busy ? "RESTORING..." : `RESTORE SNAPSHOT (v${selectedSnapshot.documentVersion})`}
          </button>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col gap-6 xl:flex-row">
        {/* Timeline Column */}
        <div className="flex w-full flex-col gap-4 xl:w-96 shrink-0">
          <div className="border-2 border-border bg-surface p-4">
            <h3 className="type-label-caps text-foreground-muted">
              Snapshot Timeline ({snapshots.length})
            </h3>

            {snapshots.length === 0 ? (
              <p className="type-body-md mt-3 border-2 border-dashed border-border p-4 text-foreground-muted">
                No immutable snapshots created yet. Snapshots are recorded when proposals or edits are committed.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {snapshots.map((snap) => (
                  <li key={snap.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSnapshotId && selectedSnapshotId !== snap.id) {
                          setComparedSnapshotId(selectedSnapshotId);
                        }
                        setSelectedSnapshotId(snap.id);
                      }}
                      className={cx(
                        "flex w-full flex-col items-start gap-1.5 border-2 p-3 text-left transition-all",
                        snap.id === selectedSnapshotId
                          ? "border-accent bg-accent-muted/30"
                          : snap.id === comparedSnapshotId
                          ? "border-warning bg-warning-muted/20"
                          : "border-border hover:border-border-strong bg-surface"
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="type-mono-data font-bold text-foreground">
                          v{snap.documentVersion} · {snap.creationReason}
                        </span>
                        <StatusBadge kind={snap.status === "active" ? "success" : "neutral"}>
                          {snap.status}
                        </StatusBadge>
                      </div>

                      <div className="flex flex-col gap-1 text-xs text-foreground-muted">
                        <span className="type-mono-data font-mono truncate max-w-full">
                          Hash: {snap.semanticHash.substring(0, 12)}...
                        </span>
                        <span className="type-mono-data">
                          Created: {new Date(snap.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Active Drift Items Panel */}
          <div className="border-2 border-border bg-surface p-4">
            <h3 className="type-label-caps text-foreground-muted">
              Active Drift Items ({driftItems.length})
            </h3>

            {driftItems.length === 0 ? (
              <p className="type-body-md mt-2 text-xs text-foreground-muted">
                No active drift detected against intended architecture.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {driftItems.map((drift) => (
                  <li key={drift.id} className="border border-border p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="type-mono-data font-semibold text-xs text-foreground">
                        {drift.driftCategory}
                      </span>
                      <StatusBadge kind={drift.severity === "critical" ? "critical" : "warning"}>
                        {drift.severity}
                      </StatusBadge>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onResolveDrift(drift.id, "accepted")}
                        className="type-label-caps flex-1 border border-border px-2 py-1 text-xs text-success hover:bg-success-muted"
                      >
                        ACCEPT DRIFT
                      </button>
                      <button
                        type="button"
                        onClick={() => onResolveDrift(drift.id, "rejected")}
                        className="type-label-caps flex-1 border border-border px-2 py-1 text-xs text-critical hover:bg-critical-muted"
                      >
                        REJECT
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Diff & Canvas View Column */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {diffResult && (
            <div className="border-2 border-border bg-surface p-4">
              <h3 className="type-label-caps text-foreground-muted">
                Semantic Snapshot Diff (v{diffResult.targetVersion ?? "A"} vs v{diffResult.baseVersion ?? "B"})
              </h3>
              <div className="mt-2 flex items-center gap-4 type-mono-data text-xs text-foreground-muted">
                <span>Added Components: <strong className="text-success">{diffResult.summary.addedComponents}</strong></span>
                <span>Removed Components: <strong className="text-critical">{diffResult.summary.removedComponents}</strong></span>
                <span>Modified Components: <strong className="text-warning">{diffResult.summary.modifiedComponents}</strong></span>
              </div>
            </div>
          )}

          <div className="border-2 border-border bg-surface p-4">
            <ReadOnlyArchitectureCanvas
              document={selectedDoc}
              label={`Selected Snapshot v${selectedSnapshot?.documentVersion ?? "Current"}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
