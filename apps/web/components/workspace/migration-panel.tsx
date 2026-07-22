"use client";

import { Button, cx } from "@axon/ui";
import { useEffect, useState } from "react";

import { isClientCloudMode } from "@/lib/persistence/client-mode";
import {
  listLocalProjects,
  migrateLocalToCloud,
  type LocalMigrationCandidate,
  type MigrationResult,
} from "@/lib/persistence/migrate-local-to-cloud";

type Phase = "idle" | "confirm" | "migrating" | "done" | "error";

/**
 * Offers to move browser-local projects into the signed-in account. Shown only
 * in cloud mode when local projects exist, and only ever migrates on an
 * explicit confirmation. Migration is non-destructive by default: local copies
 * are cleared only when the user opts in.
 */
export function MigrationPanel() {
  const [candidates, setCandidates] = useState<LocalMigrationCandidate[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [clearLocal, setClearLocal] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isClientCloudMode()) return;
    void listLocalProjects().then(setCandidates);
  }, []);

  if (!isClientCloudMode() || candidates.length === 0 || phase === "done") {
    if (phase === "done" && result !== null) {
      return (
        <div
          className="rounded-module border-2 border-success bg-success-muted/40 p-4"
          role="status"
        >
          <p className="type-body-md">
            Migrated {result.migrated.length} project{result.migrated.length === 1 ? "" : "s"} into
            your account
            {result.skipped.length > 0 ? `, skipped ${String(result.skipped.length)}.` : "."}
          </p>
        </div>
      );
    }
    return null;
  }

  const runMigration = async () => {
    setPhase("migrating");
    try {
      const outcome = await migrateLocalToCloud({ clearLocalAfter: clearLocal });
      setResult(outcome);
      setPhase("done");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Migration failed.");
      setPhase("error");
    }
  };

  return (
    <div className="rounded-module border-2 border-accent bg-accent-muted/30 p-4">
      <h2 className="type-headline-md">Bring your local projects into your account</h2>
      <p className="type-body-md mt-2 text-foreground-muted">
        {candidates.length} project{candidates.length === 1 ? "" : "s"} stored in this browser can
        be migrated to server storage tied to your account. This copies them; nothing is sent
        without your confirmation.
      </p>
      <ul className="mt-3 flex flex-col gap-1">
        {candidates.map((candidate) => (
          <li key={candidate.localId} className="type-mono-data text-foreground-muted">
            {candidate.name}
          </li>
        ))}
      </ul>

      <label htmlFor="migrate-clear-local" className="mt-4 flex items-center gap-2">
        <input
          id="migrate-clear-local"
          type="checkbox"
          checked={clearLocal}
          onChange={(event) => {
            setClearLocal(event.target.checked);
          }}
        />
        <span className="type-body-md">Remove the local copies after a successful migration</span>
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {phase === "confirm" ? (
          <>
            <Button variant="primary" size="sm" onClick={() => void runMigration()}>
              Confirm migration
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPhase("idle")}>
              Cancel
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            size="sm"
            disabled={phase === "migrating"}
            onClick={() => setPhase("confirm")}
          >
            {phase === "migrating"
              ? "Migrating…"
              : `Migrate ${String(candidates.length)} project${candidates.length === 1 ? "" : "s"}`}
          </Button>
        )}
        {error !== null && (
          <p className={cx("type-mono-data text-critical")} role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
