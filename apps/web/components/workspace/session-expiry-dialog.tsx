"use client";

import { Button } from "@axon/ui";
import { useEffect, useRef, useState } from "react";

import {
  isSessionExpiryActive,
  onSessionExpiry,
  resetSessionExpiry,
} from "@/lib/persistence/session-expiry-coordinator";
import {
  clearRecoveryRecord,
  loadRecoveryRecord,
  type RecoveryRecord,
} from "@/lib/persistence/session-recovery";

/**
 * The single session-expiry recovery experience. Mounted once at the app root;
 * it renders only when the coordinator is active, so concurrent failed requests
 * never stack dialogs. It preserves unsaved architecture (via the recovery
 * record), lets the user copy the JSON or discard it, and offers to sign in
 * again — returning to a safe internal route. Destructive operations are never
 * replayed automatically.
 */
export function SessionExpiryDialog() {
  const [active, setActive] = useState(false);
  const [record, setRecord] = useState<RecoveryRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const sync = () => {
      const isActive = isSessionExpiryActive();
      setActive(isActive);
      if (isActive) {
        setRecord(loadRecoveryRecord());
        previousFocus.current = document.activeElement as HTMLElement | null;
      }
    };
    sync();
    return onSessionExpiry(sync);
  }, []);

  useEffect(() => {
    if (active) confirmRef.current?.focus();
    else previousFocus.current?.focus?.();
  }, [active]);

  if (!active) return null;

  const signInRoute = `/sign-in?callbackUrl=${encodeURIComponent(record?.safeRoute ?? "/projects")}`;

  const copyJson = async () => {
    if (record === null) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(record.document, null, 2));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const discard = () => {
    clearRecoveryRecord();
    resetSessionExpiry();
    setActive(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-expiry-title"
        aria-describedby="session-expiry-desc"
        className="max-h-full w-full max-w-lg overflow-auto border-2 border-border-strong bg-surface p-6"
      >
        <h2 id="session-expiry-title" className="type-headline-md">
          Your AXON session has expired
        </h2>
        <p id="session-expiry-desc" className="type-body-md mt-3 text-foreground-muted">
          You were signed out, so your most recent change was not saved to your account.
          {record !== null
            ? " Your unsaved architecture is preserved below — copy it if you want a backup — then sign in again to continue."
            : " Sign in again to continue."}
        </p>

        {record !== null && (
          <div className="mt-4 border-2 border-border bg-surface-muted p-3">
            <p className="type-mono-data text-foreground-muted">
              Unsaved changes for project {record.projectId}
              {record.expectedRevision !== null
                ? ` (expected revision ${String(record.expectedRevision)})`
                : ""}
            </p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => void copyJson()}>
              {copied ? "Copied" : "Copy architecture JSON"}
            </Button>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            ref={confirmRef}
            variant="primary"
            size="md"
            onClick={() => {
              window.location.assign(signInRoute);
            }}
          >
            Sign in again
          </Button>
          <Button variant="secondary" size="md" onClick={discard}>
            Discard unsaved changes
          </Button>
        </div>
        <p className="type-mono-data mt-4 text-foreground-muted">
          Nothing is retried automatically. Your previously saved account version is unchanged.
        </p>
      </div>
    </div>
  );
}
