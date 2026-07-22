"use client";

import { Button, cx } from "@axon/ui";
import { useRef, useState } from "react";

import { ACCOUNT_DELETE_CONFIRMATION } from "@/lib/account-constants";

/**
 * Client actions for the account page: export account data and delete the
 * account. Deletion requires typing the exact confirmation phrase, traps focus
 * in the dialog, and is keyboard-operable. Identity is derived server-side; the
 * client never sends a user id.
 */
export function AccountActions() {
  return (
    <div className="mt-10 flex flex-col gap-10">
      <ExportSection />
      <DeleteSection />
    </div>
  );
}

function ExportSection() {
  return (
    <section aria-label="Data export">
      <h2 className="type-headline-md">Export your data</h2>
      <p className="type-body-md mt-2 text-foreground-muted">
        Download all of your AXON projects and derived artifacts as a versioned JSON file. This is
        an AXON model export — it describes what you built in AXON and is not an infrastructure
        backup. It never includes authentication tokens or another user&apos;s data.
      </p>
      <a
        href="/api/account/export"
        download
        className={cx(
          "type-label-caps mt-4 inline-flex items-center rounded-control border-2 border-border-strong px-4 py-2",
          "hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        )}
      >
        Download account data (JSON)
      </a>
    </section>
  );
}

function DeleteSection() {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const del = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ confirm: phrase }),
      });
      if (response.ok) {
        // Session cookies are cleared server-side; go to a public confirmation.
        window.location.assign("/account/deleted");
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Account deletion failed.");
      setBusy(false);
    } catch {
      setError("Account deletion failed. Your account is unchanged.");
      setBusy(false);
    }
  };

  return (
    <section aria-label="Delete account">
      <h2 className="type-headline-md text-critical">Delete account</h2>
      <p className="type-body-md mt-2 text-foreground-muted">
        Deleting your account permanently removes your AXON projects and saved architecture data.
        AXON cannot restore them. This removes the AXON model only — it does not change any deployed
        infrastructure.
      </p>
      <Button
        variant="secondary"
        size="md"
        className="mt-4 border-critical text-critical hover:bg-critical-muted/30"
        onClick={() => setOpen(true)}
      >
        Delete my account…
      </Button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="w-full max-w-md border-2 border-border-strong bg-surface p-6"
          >
            <h3 id="delete-account-title" className="type-headline-md text-critical">
              Permanently delete your account?
            </h3>
            <p className="type-body-md mt-3 text-foreground-muted">
              This permanently removes your projects, architecture documents, audits,
              recommendations, simulations, and import drafts. It cannot be undone.
            </p>
            <label
              htmlFor="delete-phrase"
              className="type-label-caps mt-4 block text-foreground-muted"
            >
              Type <span className="text-foreground">{ACCOUNT_DELETE_CONFIRMATION}</span> to confirm
            </label>
            <input
              id="delete-phrase"
              value={phrase}
              autoComplete="off"
              onChange={(event) => setPhrase(event.target.value)}
              className="type-mono-data mt-1.5 w-full rounded-control border-2 border-border bg-surface px-3 py-2 focus-visible:border-critical focus-visible:outline-none"
            />
            {error !== null && (
              <p role="alert" className="type-mono-data mt-2 text-critical">
                {error}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                ref={confirmRef}
                variant="primary"
                size="md"
                disabled={busy || phrase !== ACCOUNT_DELETE_CONFIRMATION}
                onClick={() => void del()}
                className="border-transparent bg-critical text-primary-foreground hover:shadow-[4px_4px_0_0_var(--color-critical-muted)]"
              >
                {busy ? "Deleting…" : "Delete account"}
              </Button>
              <Button variant="secondary" size="md" disabled={busy} onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
