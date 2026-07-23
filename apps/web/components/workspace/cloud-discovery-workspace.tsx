"use client";

import { useState } from "react";
import { 
  type CloudConnection, 
  type DiscoveredCloudAsset, 
  type CloudProvider, 
  type CloudReconciliationStatus 
} from "@axon/repo-intel";
import { StatusBadge, cx } from "@axon/ui";

export interface CloudDiscoveryWorkspaceProps {
  connections: CloudConnection[];
  assets: DiscoveredCloudAsset[];
  onRegisterConnection: (provider: CloudProvider, accountOrProjectId: string, roleArnOrServiceAccount: string) => Promise<void>;
  onRunDiscovery: (connectionId: string) => Promise<void>;
}

type StatusFilter = "all" | CloudReconciliationStatus;

export function CloudDiscoveryWorkspace({
  connections,
  assets,
  onRegisterConnection,
  onRunDiscovery,
}: CloudDiscoveryWorkspaceProps) {
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider>("aws");
  const [accountOrProjectId, setAccountOrProjectId] = useState("");
  const [roleArnOrServiceAccount, setRoleArnOrServiceAccount] = useState("");
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(
    connections[0]?.id ?? null
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [busy, setBusy] = useState(false);
  const [discovering, setDiscovering] = useState(false);

  const handleRegister = async () => {
    if (!accountOrProjectId || !roleArnOrServiceAccount) return;
    setBusy(true);
    try {
      await onRegisterConnection(selectedProvider, accountOrProjectId, roleArnOrServiceAccount);
      setAccountOrProjectId("");
      setRoleArnOrServiceAccount("");
    } finally {
      setBusy(false);
    }
  };

  const handleRunDiscovery = async () => {
    if (!selectedConnectionId) return;
    setDiscovering(true);
    try {
      await onRunDiscovery(selectedConnectionId);
    } finally {
      setDiscovering(false);
    }
  };

  const filteredAssets = assets.filter(
    (a) => statusFilter === "all" || a.reconciliationStatus === statusFilter
  );

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Spatial Blueprint Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-border-strong bg-surface p-4 shadow-sm">
        <div>
          <h2 className="type-headline-md font-bold text-foreground">
            Read-Only Cloud Discovery & Reconciliation Ledger
          </h2>
          <p className="type-mono-data mt-1 text-foreground-muted">
            Connected Cloud Accounts: <span className="text-accent">{connections.length}</span> · Discovered Assets: {assets.length}
          </p>
        </div>

        {selectedConnectionId && (
          <button
            type="button"
            disabled={discovering}
            onClick={handleRunDiscovery}
            className="type-label-caps bg-primary px-4 py-2 text-primary-foreground transition-all hover:bg-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            {discovering ? "DISCOVERING..." : "RUN READ-ONLY DISCOVERY"}
          </button>
        )}
      </div>

      {/* Connection Setup & Asset Inventory Grid */}
      <div className="flex flex-col gap-6 xl:flex-row">
        {/* Left Column: Cloud Connection Registration */}
        <div className="w-full xl:w-96 shrink-0 flex flex-col gap-4">
          <div className="border-2 border-border bg-surface p-4 flex flex-col gap-3">
            <h3 className="type-label-caps text-foreground-muted">
              Connect Read-Only Cloud Role
            </h3>

            <div>
              <label htmlFor="cloud-provider-select" className="type-mono-data text-xs text-foreground-muted">
                Cloud Provider
              </label>
              <select
                id="cloud-provider-select"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as CloudProvider)}
                className="mt-1 w-full border-2 border-border bg-surface p-2 type-mono-data text-foreground"
              >
                <option value="aws">AWS (Amazon Web Services)</option>
                <option value="gcp">GCP (Google Cloud Platform)</option>
              </select>
            </div>

            <div>
              <label htmlFor="cloud-account-input" className="type-mono-data text-xs text-foreground-muted">
                {selectedProvider === "aws" ? "AWS Account ID" : "GCP Project ID"}
              </label>
              <input
                id="cloud-account-input"
                type="text"
                placeholder={selectedProvider === "aws" ? "123456789012" : "my-gcp-project"}
                value={accountOrProjectId}
                onChange={(e) => setAccountOrProjectId(e.target.value)}
                className="mt-1 w-full border-2 border-border bg-surface p-2 type-mono-data text-foreground"
              />
            </div>

            <div>
              <label htmlFor="cloud-role-input" className="type-mono-data text-xs text-foreground-muted">
                {selectedProvider === "aws" ? "Read-Only IAM Role ARN" : "Read-Only Service Account"}
              </label>
              <input
                id="cloud-role-input"
                type="text"
                placeholder={
                  selectedProvider === "aws"
                    ? "arn:aws:iam::123456789012:role/ReadOnly"
                    : "reader@my-project.iam.gserviceaccount.com"
                }
                value={roleArnOrServiceAccount}
                onChange={(e) => setRoleArnOrServiceAccount(e.target.value)}
                className="mt-1 w-full border-2 border-border bg-surface p-2 type-mono-data text-foreground"
              />
            </div>

            <button
              type="button"
              disabled={busy || !accountOrProjectId || !roleArnOrServiceAccount}
              onClick={handleRegister}
              className="mt-2 type-label-caps border-2 border-accent bg-accent-muted py-2 text-foreground transition-all hover:bg-accent hover:text-white"
            >
              {busy ? "CONNECTING..." : "CONNECT READ-ONLY ACCOUNT"}
            </button>
          </div>

          {/* Connected Accounts List */}
          <div className="border-2 border-border bg-surface p-4">
            <h3 className="type-label-caps text-foreground-muted">
              Connected Accounts ({connections.length})
            </h3>
            <ul className="mt-3 flex flex-col gap-2">
              {connections.map((conn) => (
                <li key={conn.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedConnectionId(conn.id)}
                    className={cx(
                      "flex w-full flex-col items-start gap-1 border-2 p-3 text-left transition-all",
                      conn.id === selectedConnectionId
                        ? "border-accent bg-accent-muted/30"
                        : "border-border hover:border-border-strong bg-surface"
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="type-body-md font-bold uppercase text-foreground">
                        {conn.provider} · {conn.accountOrProjectId}
                      </span>
                      <StatusBadge kind="success">{conn.status}</StatusBadge>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Discovered Asset Inventory */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="border-2 border-border bg-surface p-4">
            <div className="flex items-center justify-between border-b-2 border-border pb-3">
              <div role="tablist" className="flex gap-2">
                {(["all", "matched", "unmanaged"] as StatusFilter[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === tab}
                    onClick={() => setStatusFilter(tab)}
                    className={cx(
                      "type-label-caps border-2 px-3 py-1.5 transition-all",
                      statusFilter === tab
                        ? "border-accent bg-accent-muted text-foreground"
                        : "border-border text-foreground-muted hover:border-border-strong"
                    )}
                  >
                    {tab === "unmanaged" ? "UNMANAGED (SHADOW IT)" : tab.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {filteredAssets.length === 0 ? (
              <p className="type-body-md mt-4 border-2 border-dashed border-border p-6 text-center text-foreground-muted">
                No live cloud assets found for this filter. Run discovery above to scan.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {filteredAssets.map((asset) => (
                  <li key={asset.id} className="border-2 border-border p-4 flex flex-col gap-2 bg-surface">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="type-body-md font-bold text-foreground">{asset.name}</span>
                        <span className="type-mono-data ml-3 text-xs text-foreground-muted uppercase">
                          {asset.resourceType}
                        </span>
                      </div>
                      <StatusBadge kind={asset.reconciliationStatus === "matched" ? "success" : "warning"}>
                        {asset.reconciliationStatus}
                      </StatusBadge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
