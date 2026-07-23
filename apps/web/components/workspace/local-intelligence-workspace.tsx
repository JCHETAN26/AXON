"use client";

import { useState } from "react";
import { StatusBadge, type StatusKind } from "@axon/ui";

export type OperatingMode = "hosted" | "local-evidence" | "fully-local";

export interface LocalAgent {
  id: string;
  agentName: string;
  machineLabel: string;
  workspaceScope: string;
  allowedCapabilities: string[];
  lastConnectedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface SyncRun {
  id: string;
  evidenceCount: number;
  componentCount: number;
  status: string;
  syncedAt: string | null;
}

export interface LocalIntelligenceWorkspaceProps {
  mode: OperatingMode;
  agents: LocalAgent[];
  syncRuns: SyncRun[];
  onCreateAgent: (agentName: string, machineLabel: string) => Promise<{ token: string } | null>;
  onRevokeAgent: (agentId: string) => Promise<void>;
}

const MODE_LABELS: Record<OperatingMode, { label: string; description: string; kind: StatusKind }> =
  {
    hosted: {
      label: "HOSTED REPOSITORY MODE",
      description:
        "GitHub App accesses selected repositories. Analysis occurs through hosted services.",
      kind: "success",
    },
    "local-evidence": {
      label: "LOCAL EVIDENCE MODE",
      description:
        "Raw files remain on your machine. Only approved, redacted evidence may be synchronized.",
      kind: "info",
    },
    "fully-local": {
      label: "FULLY LOCAL MODE",
      description: "All analysis runs locally. No source code or evidence leaves your machine.",
      kind: "warning",
    },
  };

export function LocalIntelligenceWorkspace({
  mode,
  agents,
  syncRuns,
  onCreateAgent,
  onRevokeAgent,
}: LocalIntelligenceWorkspaceProps) {
  const [newAgentName, setNewAgentName] = useState("");
  const [newMachineLabel, setNewMachineLabel] = useState("");
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [lastCreatedToken, setLastCreatedToken] = useState<string | null>(null);

  const modeInfo = MODE_LABELS[mode];

  const handleCreateAgent = async () => {
    if (!newAgentName.trim() || !newMachineLabel.trim()) return;
    setCreatingAgent(true);
    try {
      const result = await onCreateAgent(newAgentName, newMachineLabel);
      if (result) {
        setLastCreatedToken(result.token);
        setNewAgentName("");
        setNewMachineLabel("");
      }
    } finally {
      setCreatingAgent(false);
    }
  };

  const activeAgents = agents.filter((a) => !a.revokedAt);
  const revokedAgents = agents.filter((a) => a.revokedAt);

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Spatial Blueprint Header with Operating Mode */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-border-strong bg-surface p-4 shadow-sm">
        <div>
          <h2 className="type-headline-md font-bold text-foreground">
            Local Architecture Intelligence
          </h2>
          <p className="type-mono-data mt-1 text-foreground-muted">
            Analyze private repositories, local Terraform, and Kubernetes without uploading source
            code.
          </p>
        </div>

        <StatusBadge kind={modeInfo.kind}>{modeInfo.label}</StatusBadge>
      </div>

      {/* Main Layout: Instructions + Agent Management */}
      <div className="flex flex-col gap-6 xl:flex-row">
        {/* Left: MCP Setup & Mode Info */}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {/* Mode Explanation */}
          <section className="border-2 border-border bg-surface p-4">
            <h3 className="type-label-caps text-foreground-muted border-b-2 border-border pb-3">
              Current Operating Mode
            </h3>
            <p className="type-body-md mt-3 text-foreground">{modeInfo.description}</p>
          </section>

          {/* MCP Installation Instructions */}
          <section className="border-2 border-border bg-surface p-4">
            <h3 className="type-label-caps text-foreground-muted border-b-2 border-border pb-3">
              MCP Server Installation
            </h3>
            <div className="mt-3 flex flex-col gap-3">
              <p className="type-body-md text-foreground">
                Install the AXON MCP server to analyze local repositories:
              </p>

              <div className="border-2 border-border bg-surface-muted p-3">
                <pre className="type-mono-data text-xs text-foreground font-mono whitespace-pre">
                  {`# Install and start the MCP server
npx @axon/mcp-server --stdio

# Optional CLI state file for durable normalized local state
axon-mcp analyze --root ./repo --state-file .axon/mcp-state.json
axon-mcp export --root ./repo --state-file .axon/mcp-state.json --json`}
                </pre>
              </div>

              <div className="border-2 border-border bg-surface-muted p-3">
                <p className="type-mono-data text-xs text-foreground-muted">
                  MCP Configuration (add to your MCP client config):
                </p>
                <pre className="type-mono-data text-xs text-foreground font-mono whitespace-pre mt-2">
                  {`{
  "mcpServers": {
    "axon": {
      "command": "npx",
      "args": ["@axon/mcp-server", "--stdio"],
      "transport": "stdio"
    }
  }
}`}
                </pre>
              </div>

              <p className="type-body-md text-xs text-foreground-muted">
                The MCP server uses stdio and does not open a network listener. No source code is
                transmitted to external services unless you explicitly synchronize evidence.
              </p>
            </div>
          </section>

          {/* Evidence Sync History */}
          <section className="border-2 border-border bg-surface p-4">
            <h3 className="type-label-caps text-foreground-muted border-b-2 border-border pb-3">
              Evidence Synchronization History ({syncRuns.length})
            </h3>
            {syncRuns.length === 0 ? (
              <p className="type-body-md mt-3 text-xs text-foreground-muted">
                No evidence has been synchronized to this hosted workspace yet.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {syncRuns.map((run) => (
                  <li
                    key={run.id}
                    className="border-2 border-border p-3 bg-surface flex items-center justify-between"
                  >
                    <div>
                      <span className="type-mono-data text-xs text-foreground">
                        {run.evidenceCount} evidence records · {run.componentCount} components
                      </span>
                    </div>
                    <StatusBadge kind={run.status === "synced" ? "success" : "info"}>
                      {run.status}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right: Agent Management */}
        <aside className="w-full shrink-0 border-2 border-border-strong bg-surface p-5 xl:w-96 flex flex-col gap-5">
          {/* Create Agent */}
          <div>
            <h3 className="type-label-caps text-foreground-muted border-b-2 border-border pb-3">
              Pair New Local Agent
            </h3>
            <div className="mt-3 flex flex-col gap-2">
              <label
                htmlFor="agent-name-input"
                className="type-mono-data text-xs text-foreground-muted"
              >
                Agent Name
              </label>
              <input
                id="agent-name-input"
                type="text"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                placeholder="e.g. Dev Laptop"
                className="border-2 border-border bg-surface p-2 type-mono-data text-foreground"
              />

              <label
                htmlFor="machine-label-input"
                className="type-mono-data text-xs text-foreground-muted"
              >
                Machine Label
              </label>
              <input
                id="machine-label-input"
                type="text"
                value={newMachineLabel}
                onChange={(e) => setNewMachineLabel(e.target.value)}
                placeholder="e.g. macbook-pro-m4"
                className="border-2 border-border bg-surface p-2 type-mono-data text-foreground"
              />

              <button
                type="button"
                disabled={creatingAgent || !newAgentName.trim() || !newMachineLabel.trim()}
                onClick={handleCreateAgent}
                className="type-label-caps bg-primary px-4 py-2 text-primary-foreground transition-all hover:bg-accent mt-2"
              >
                {creatingAgent ? "CREATING..." : "CREATE AGENT PAIRING"}
              </button>
            </div>

            {lastCreatedToken && (
              <div className="mt-3 border-2 border-warning bg-warning-muted p-3">
                <p className="type-label-caps text-xs text-warning font-bold">
                  ⚠ AGENT TOKEN — SHOWN ONCE ONLY
                </p>
                <pre className="type-mono-data text-xs text-foreground font-mono mt-2 break-all whitespace-pre-wrap">
                  {lastCreatedToken}
                </pre>
                <p className="type-body-md text-xs text-foreground-muted mt-2">
                  Copy this token now. It will not be shown again after you navigate away.
                </p>
              </div>
            )}
          </div>

          {/* Active Agents */}
          <div>
            <h3 className="type-label-caps text-foreground-muted border-b-2 border-border pb-3">
              Connected Agents ({activeAgents.length})
            </h3>
            {activeAgents.length === 0 ? (
              <p className="type-body-md mt-3 text-xs text-foreground-muted">
                No active local agents connected.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {activeAgents.map((agent) => (
                  <li
                    key={agent.id}
                    className="border-2 border-border p-3 bg-surface flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="type-body-md font-bold text-foreground">
                        {agent.agentName}
                      </span>
                      <StatusBadge kind="success">ACTIVE</StatusBadge>
                    </div>
                    <span className="type-mono-data text-xs text-foreground-muted font-mono">
                      Machine: {agent.machineLabel}
                    </span>
                    {agent.lastConnectedAt && (
                      <span className="type-mono-data text-xs text-foreground-muted font-mono">
                        Last connected: {new Date(agent.lastConnectedAt).toLocaleString()}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onRevokeAgent(agent.id)}
                      className="type-label-caps border-2 border-destructive px-3 py-1 text-destructive text-xs hover:bg-destructive hover:text-destructive-foreground transition-all self-start mt-1"
                    >
                      REVOKE ACCESS
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Revoked Agents */}
          {revokedAgents.length > 0 && (
            <div>
              <h3 className="type-label-caps text-foreground-muted border-b-2 border-border pb-3">
                Revoked Agents ({revokedAgents.length})
              </h3>
              <ul className="mt-3 flex flex-col gap-2">
                {revokedAgents.map((agent) => (
                  <li
                    key={agent.id}
                    className="border-2 border-border p-3 bg-surface-muted opacity-60"
                  >
                    <div className="flex items-center justify-between">
                      <span className="type-body-md text-foreground-muted">{agent.agentName}</span>
                      <StatusBadge kind="critical">REVOKED</StatusBadge>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Troubleshooting */}
          <div>
            <h3 className="type-label-caps text-foreground-muted border-b-2 border-border pb-3">
              Troubleshooting
            </h3>
            <div className="mt-3 text-xs type-mono-data text-foreground-muted flex flex-col gap-1">
              <p>
                • Run <code className="text-accent">axon-mcp doctor</code> to verify setup
              </p>
              <p>• Ensure port 3100 (default) is not in use</p>
              <p>• Check that your workspace root contains supported files (.ts, .tf, .yaml)</p>
              <p>• Agent tokens expire after 5 minutes if unused</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
