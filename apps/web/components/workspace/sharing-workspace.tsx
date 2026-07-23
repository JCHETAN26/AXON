"use client";

import { Button, StatusBadge } from "@axon/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

type ShareRole = "editor" | "commenter" | "viewer";
type ShareStatus = "idle" | "loading" | "ready" | "saving" | "error";

interface ShareLink {
  readonly id: string;
  readonly role: ShareRole;
  readonly label?: string;
  readonly expiresAt?: string;
  readonly revokedAt?: string;
  readonly createdAt: string;
}

interface CreatedShareLink extends ShareLink {
  readonly rawToken: string;
}

export function SharingWorkspace({ projectId }: { projectId: string }) {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [status, setStatus] = useState<ShareStatus>("idle");
  const [role, setRole] = useState<ShareRole>("viewer");
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<CreatedShareLink | null>(null);
  const shareUrl = useMemo(
    () => `/api/projects/${encodeURIComponent(projectId)}/share-links`,
    [projectId],
  );

  const loadShareLinks = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await fetch(shareUrl, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error("Failed to load share links.");
      const payload = (await response.json()) as { shareLinks?: ShareLink[] };
      setShareLinks(payload.shareLinks ?? []);
      setStatus("ready");
    } catch {
      setShareLinks([]);
      setStatus("error");
    }
  }, [shareUrl]);

  useEffect(() => {
    void loadShareLinks();
  }, [loadShareLinks]);

  const createShareLink = useCallback(async () => {
    setStatus("saving");
    setCreated(null);
    try {
      const response = await fetch(shareUrl, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          role,
          ...(label.trim().length > 0 && { label: label.trim() }),
        }),
      });
      if (!response.ok) throw new Error("Failed to create share link.");
      const payload = (await response.json()) as { shareLink: CreatedShareLink };
      setCreated(payload.shareLink);
      setLabel("");
      await loadShareLinks();
    } catch {
      setStatus("error");
    }
  }, [label, loadShareLinks, role, shareUrl]);

  const revokeShareLink = useCallback(
    async (shareLinkId: string) => {
      setStatus("saving");
      try {
        const response = await fetch(`${shareUrl}/${encodeURIComponent(shareLinkId)}`, {
          method: "DELETE",
          headers: { accept: "application/json" },
        });
        if (!response.ok) throw new Error("Failed to revoke share link.");
        await loadShareLinks();
      } catch {
        setStatus("error");
      }
    },
    [loadShareLinks, shareUrl],
  );

  return (
    <section className="flex flex-col gap-6" aria-labelledby="sharing-heading">
      <div className="flex flex-wrap items-start justify-between gap-3 border-2 border-border-strong bg-surface p-4">
        <div>
          <p className="type-label-caps text-foreground-muted">Collaboration</p>
          <h2 id="sharing-heading" className="type-headline-md mt-2">
            Sharing
          </h2>
          <p className="type-body-md mt-2 text-foreground-muted">
            Create revocable project links with scoped roles. Raw tokens are shown only once.
          </p>
        </div>
        <StatusBadge kind={status === "error" ? "warning" : "info"}>
          {status === "loading" ? "LOADING" : `${shareLinks.length} LINKS`}
        </StatusBadge>
      </div>

      <form
        className="grid gap-3 border-2 border-border bg-surface p-4 md:grid-cols-[180px_minmax(0,1fr)_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void createShareLink();
        }}
      >
        <label className="flex flex-col gap-2">
          <span className="type-label-caps text-foreground-muted">Role</span>
          <select
            value={role}
            onChange={(event) => {
              setRole(event.target.value as ShareRole);
            }}
            className="type-body-md border-2 border-border bg-surface px-3 py-2 text-foreground"
          >
            <option value="viewer">Viewer</option>
            <option value="commenter">Commenter</option>
            <option value="editor">Editor</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="type-label-caps text-foreground-muted">Label</span>
          <input
            value={label}
            onChange={(event) => {
              setLabel(event.target.value);
            }}
            maxLength={120}
            placeholder="Design review"
            className="type-body-md border-2 border-border bg-surface px-3 py-2 text-foreground"
          />
        </label>
        <Button
          type="submit"
          variant="technical"
          size="sm"
          className="self-end"
          disabled={status === "saving"}
        >
          Create Link
        </Button>
      </form>

      {created !== null ? (
        <section className="border-2 border-border-strong bg-surface p-4" aria-live="polite">
          <p className="type-label-caps text-foreground-muted">One-time token</p>
          <p className="type-mono-data mt-3 break-all text-foreground">{created.rawToken}</p>
        </section>
      ) : null}

      <section className="border-2 border-border bg-surface p-4">
        <h3 className="type-label-caps text-foreground-muted">Active Links</h3>
        {shareLinks.length === 0 ? (
          <p className="type-body-md mt-3 text-foreground-muted">No share links yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {shareLinks.map((shareLink) => (
              <li
                key={shareLink.id}
                className="flex flex-wrap items-center justify-between gap-3 border-2 border-border p-3"
              >
                <div>
                  <p className="type-body-md text-foreground">
                    {shareLink.label ?? "Untitled share link"}
                  </p>
                  <p className="type-mono-data text-foreground-muted">
                    {shareLink.role.toUpperCase()} · created{" "}
                    {new Date(shareLink.createdAt).toLocaleDateString("en-US")}
                  </p>
                </div>
                {shareLink.revokedAt === undefined ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      void revokeShareLink(shareLink.id);
                    }}
                    disabled={status === "saving"}
                  >
                    Revoke
                  </Button>
                ) : (
                  <StatusBadge kind="warning">REVOKED</StatusBadge>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
