import { ThemeProvider } from "@axon/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  LocalIntelligenceWorkspace,
  type LocalAgent,
  type SyncRun,
} from "./local-intelligence-workspace";

const AGENTS: LocalAgent[] = [
  {
    id: "agent-1",
    agentName: "Dev Laptop",
    machineLabel: "macbook-m4",
    workspaceScope: "project-1",
    allowedCapabilities: ["analyze", "audit"],
    lastConnectedAt: "2026-07-22T10:00:00Z",
    revokedAt: null,
    createdAt: "2026-07-20T00:00:00Z",
  },
  {
    id: "agent-2",
    agentName: "CI Runner",
    machineLabel: "github-actions",
    workspaceScope: "project-1",
    allowedCapabilities: ["analyze"],
    lastConnectedAt: null,
    revokedAt: "2026-07-21T00:00:00Z",
    createdAt: "2026-07-19T00:00:00Z",
  },
];

const SYNC_RUNS: SyncRun[] = [
  {
    id: "sync-1",
    evidenceCount: 42,
    componentCount: 8,
    status: "synced",
    syncedAt: "2026-07-22T12:00:00Z",
  },
];

function renderWorkspace(
  overrides: Partial<Parameters<typeof LocalIntelligenceWorkspace>[0]> = {}
) {
  const props = {
    mode: "local-evidence" as const,
    agents: AGENTS,
    syncRuns: SYNC_RUNS,
    onCreateAgent: vi.fn().mockResolvedValue({ token: "axon_agent_test123" }),
    onRevokeAgent: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(
    <ThemeProvider>
      <LocalIntelligenceWorkspace {...props} />
    </ThemeProvider>
  );
  return props;
}

describe("LocalIntelligenceWorkspace", () => {
  it("renders header and operating mode badge", () => {
    renderWorkspace();

    expect(screen.getByText("Local Architecture Intelligence")).toBeVisible();
    expect(screen.getByText("LOCAL EVIDENCE MODE")).toBeVisible();
  });

  it("shows MCP installation instructions", () => {
    renderWorkspace();

    expect(screen.getByText("MCP Server Installation")).toBeVisible();
    expect(screen.getByText(/npx @axon\/mcp-server/)).toBeVisible();
  });

  it("lists active and revoked agents", () => {
    renderWorkspace();

    expect(screen.getByText("Dev Laptop")).toBeVisible();
    expect(screen.getByText("ACTIVE")).toBeVisible();
    expect(screen.getByText("CI Runner")).toBeVisible();
    expect(screen.getByText("REVOKED")).toBeVisible();
  });

  it("shows sync history", () => {
    renderWorkspace();

    expect(screen.getByText(/42 evidence records · 8 components/)).toBeVisible();
  });

  it("creates agent and shows token once", async () => {
    const user = userEvent.setup();
    const props = renderWorkspace();

    await user.type(screen.getByLabelText("Agent Name"), "Test Agent");
    await user.type(screen.getByLabelText("Machine Label"), "test-machine");
    await user.click(screen.getByRole("button", { name: /CREATE AGENT PAIRING/ }));

    expect(props.onCreateAgent).toHaveBeenCalledWith("Test Agent", "test-machine");
    expect(await screen.findByText(/AGENT TOKEN — SHOWN ONCE ONLY/)).toBeVisible();
  });

  it("revokes agent when button is clicked", async () => {
    const user = userEvent.setup();
    const props = renderWorkspace();

    await user.click(screen.getByRole("button", { name: /REVOKE ACCESS/ }));
    expect(props.onRevokeAgent).toHaveBeenCalledWith("agent-1");
  });

  it("renders fully-local mode badge", () => {
    renderWorkspace({ mode: "fully-local" });

    expect(screen.getByText("FULLY LOCAL MODE")).toBeVisible();
  });
});
