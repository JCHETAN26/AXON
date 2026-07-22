"use client";

import { type DocumentDiff, type Recommendation } from "@axon/architecture-recommendations";
import { Button } from "@axon/ui";
import { useEffect, useRef } from "react";

export interface ApplyApprovalDialogProps {
  recommendation: Recommendation;
  diff: DocumentDiff;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Explicit approval step. There is no "apply anyway": this dialog is only
 * reachable for a recommendation AXON has already decided it can safely
 * apply, and it states plainly that only the AXON model changes.
 */
export function ApplyApprovalDialog({
  recommendation,
  diff,
  busy,
  onConfirm,
  onCancel,
}: ApplyApprovalDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.document.addEventListener("keydown", onKeyDown);
    return () => {
      window.document.removeEventListener("keydown", onKeyDown);
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-dialog-title"
        className="max-h-full w-full max-w-lg overflow-auto border-2 border-border-strong bg-surface p-6"
      >
        <h2 id="apply-dialog-title" className="type-headline-md">
          Apply architecture-document change?
        </h2>

        <p className="type-body-md mt-3">{recommendation.proposedChange}</p>

        <div className="mt-4 border-2 border-border bg-surface-muted p-3">
          <p className="type-label-caps text-foreground-muted">This will change</p>
          <p className="type-mono-data mt-1.5">
            {diff.addedCount} added · {diff.modifiedCount} modified · {diff.removedCount} removed
          </p>
        </div>

        <ul className="type-body-md mt-4 flex list-disc flex-col gap-1.5 pl-4 text-foreground-muted">
          <li>This updates the AXON architecture model stored in this browser.</li>
          <li>
            It does not change infrastructure, source code, cloud resources, or deployment
            configuration.
          </li>
          <li>
            The source finding stays open until you rerun the audit against the updated document.
          </li>
        </ul>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button ref={confirmRef} variant="primary" size="md" onClick={onConfirm} disabled={busy}>
            {busy ? "Applying…" : "Apply Change"}
          </Button>
          <Button variant="secondary" size="md" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
