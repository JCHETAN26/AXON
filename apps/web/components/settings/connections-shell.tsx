"use client";

import { Button, buttonClasses } from "@axon/ui";
import { useCallback, useEffect, useState } from "react";

interface Installation {
  id: string;
  accountLogin: string;
  accountType: string;
  status: string;
  connectedAt: string;
}

interface Repository {
  id: string;
  installationConnectionId: string;
  fullName: string;
  defaultBranch: string;
  visibility: string;
  archived: boolean;
  url: string;
  lastAnalyzedSha: string | null;
  lastSyncStatus: string | null;
}

interface GrantedRepo {
  repoGithubId: number;
  fullName: string;
  defaultBranch: string;
  visibility: string;
  archived: boolean;
  url: string;
  connected: boolean;
}

const ERROR_TEXT: Record<string, string> = {
  "not-configured": "GitHub App is not configured on this server yet.",
  "invalid-state": "That connection link expired or was already used. Please try again.",
  "state-mismatch": "The connection was started by a different account.",
  "invalid-installation": "GitHub did not return a valid installation.",
  "installation-unavailable": "AXON could not verify that installation with GitHub.",
  "already-connected": "That GitHub installation is already connected to another account.",
  "github-unavailable": "GitHub is temporarily unavailable. Please try again.",
  unexpected: "Something went wrong connecting GitHub. Please try again.",
};

export function ConnectionsShell({ configured }: { configured: boolean }) {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/connections", { headers: { accept: "application/json" } });
      if (res.ok) {
        const body = (await res.json()) as { installations: Installation[]; repositories: Repository[] };
        setInstallations(body.installations);
        setRepositories(body.repositories);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "1") {
      setBanner({ kind: "success", text: "GitHub installation connected." });
    }
    const err = params.get("error");
    if (err !== null) {
      setBanner({ kind: "error", text: ERROR_TEXT[err] ?? "Something went wrong. Please try again." });
    }
    if (params.get("connected") !== null || err !== null) {
      window.history.replaceState({}, "", "/settings/connections");
    }
  }, []);

  const disconnect = useCallback(
    async (connectionId: string) => {
      await fetch("/api/connections", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });
      await load();
    },
    [load],
  );

  if (!configured) {
    return (
      <p className="type-body-md mt-8 border-t-2 border-border pt-6 text-foreground-muted">
        Repository connection is not enabled on this server. An operator must configure the GitHub
        App before repositories can be connected.
      </p>
    );
  }

  return (
    <div className="mt-8">
      {banner !== null && (
        <p
          role="status"
          className={
            banner.kind === "success"
              ? "type-body-md mb-6 border-l-2 border-success bg-success-muted px-4 py-3"
              : "type-body-md mb-6 border-l-2 border-critical bg-critical-muted px-4 py-3"
          }
        >
          {banner.text}
        </p>
      )}

      <div className="flex items-center justify-between border-t-2 border-border pt-6">
        <h2 className="type-headline-md">GitHub installations</h2>
        {/* A GET that begins the signed install flow; a link keeps it keyboard-native. */}
        <a href="/api/connections/github/start" className={buttonClasses("primary")}>
          Connect GitHub repository
        </a>
      </div>

      {loading ? (
        <p className="type-body-md mt-4 text-foreground-muted">Loading connections…</p>
      ) : installations.length === 0 ? (
        <p className="type-body-md mt-4 text-foreground-muted">
          No GitHub installations yet. Connect one to select repositories for analysis.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {installations.map((installation) => (
            <InstallationCard
              key={installation.id}
              installation={installation}
              repositories={repositories.filter((r) => r.installationConnectionId === installation.id)}
              onDisconnect={() => void disconnect(installation.id)}
              onChanged={() => void load()}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function InstallationCard({
  installation,
  repositories,
  onDisconnect,
  onChanged,
}: {
  installation: Installation;
  repositories: Repository[];
  onDisconnect: () => void;
  onChanged: () => void;
}) {
  const [granted, setGranted] = useState<GrantedRepo[] | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  const browse = useCallback(async () => {
    setBrowsing(true);
    const res = await fetch(`/api/connections/${installation.id}/repositories`, {
      headers: { accept: "application/json" },
    });
    if (res.ok) setGranted(((await res.json()) as { repositories: GrantedRepo[] }).repositories);
  }, [installation.id]);

  const connect = useCallback(
    async (repoGithubId: number) => {
      setBusy(repoGithubId);
      try {
        await fetch(`/api/connections/${installation.id}/repositories`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ repoGithubId }),
        });
        await browse();
        onChanged();
      } finally {
        setBusy(null);
      }
    },
    [installation.id, browse, onChanged],
  );

  return (
    <li className="border-2 border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="type-body-md font-medium">{installation.accountLogin}</span>{" "}
          <span className="type-label-caps text-foreground-muted">{installation.accountType}</span>
        </div>
        <Button variant="secondary" size="sm" onClick={onDisconnect}>
          Disconnect
        </Button>
      </div>

      {repositories.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {repositories.map((repo) => (
            <li key={repo.id} className="type-mono-data flex items-center justify-between gap-2">
              <span>{repo.fullName}</span>
              <span className="text-foreground-muted">
                {repo.lastAnalyzedSha === null ? "not analyzed" : `@ ${repo.lastAnalyzedSha.slice(0, 7)}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        {!browsing ? (
          <Button variant="secondary" size="sm" onClick={() => void browse()}>
            Add repositories
          </Button>
        ) : granted === null ? (
          <p className="type-body-md text-foreground-muted">Loading repositories…</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {granted.map((repo) => (
              <li key={repo.repoGithubId} className="type-mono-data flex items-center justify-between gap-2">
                <span>
                  {repo.fullName}
                  {repo.archived && <span className="text-foreground-muted"> (archived)</span>}
                </span>
                {repo.connected ? (
                  <span className="type-label-caps text-success">Connected</span>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy === repo.repoGithubId}
                    onClick={() => void connect(repo.repoGithubId)}
                  >
                    Connect
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
