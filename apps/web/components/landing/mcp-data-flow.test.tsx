import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { McpDataFlow, SCAN_TICK_MS } from "./mcp-data-flow";
import { DEMO_NODES } from "@/data/demo-architecture";
import { DISCOVERED_FILES, MCP_REDACTIONS } from "@/data/mcp-workflow";

const FULL_SCAN_MS = SCAN_TICK_MS * 12;

describe("McpDataFlow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts idle with no findings in the log and no approval control", () => {
    render(<McpDataFlow />);
    expect(screen.getByRole("status")).toHaveTextContent(/SCAN_IDLE/);
    expect(screen.queryByRole("button", { name: "Approve Sync" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
  });

  it("scans to the approval gate but never syncs automatically", () => {
    render(<McpDataFlow />);
    fireEvent.click(screen.getByRole("button", { name: "Run Local Scan" }));
    expect(screen.getByRole("status")).toHaveTextContent(/SCANNING/);

    act(() => {
      vi.advanceTimersByTime(FULL_SCAN_MS);
    });
    expect(screen.getByRole("status")).toHaveTextContent(/AWAITING_APPROVAL/);
    expect(screen.getByRole("button", { name: "Approve Sync" })).toBeInTheDocument();

    // The log shows discovered files and redactions from the typed data.
    const firstFile = DISCOVERED_FILES[0];
    const firstRedaction = MCP_REDACTIONS[0];
    if (firstFile !== undefined) {
      expect(screen.getByText(`+ ${firstFile}`)).toBeInTheDocument();
    }
    if (firstRedaction !== undefined) {
      expect(
        screen.getByText(`${firstRedaction.source} → ${firstRedaction.replacement}`),
      ).toBeInTheDocument();
    }

    // Waiting longer without approval must not complete the sync.
    act(() => {
      vi.advanceTimersByTime(FULL_SCAN_MS * 4);
    });
    expect(screen.getByRole("status")).toHaveTextContent(/AWAITING_APPROVAL/);
    expect(screen.queryByText(/studio received/)).not.toBeInTheDocument();
  });

  it("completes only after explicit approval", () => {
    render(<McpDataFlow />);
    fireEvent.click(screen.getByRole("button", { name: "Run Local Scan" }));
    act(() => {
      vi.advanceTimersByTime(FULL_SCAN_MS);
    });
    fireEvent.click(screen.getByRole("button", { name: "Approve Sync" }));
    act(() => {
      vi.advanceTimersByTime(SCAN_TICK_MS * 4);
    });
    expect(screen.getByRole("status")).toHaveTextContent(/SYNC_COMPLETE/);
    expect(
      screen.getByText(new RegExp(`studio received ${DEMO_NODES.length} services`)),
    ).toBeInTheDocument();
  });

  it("resets back to idle", () => {
    render(<McpDataFlow />);
    fireEvent.click(screen.getByRole("button", { name: "Run Local Scan" }));
    act(() => {
      vi.advanceTimersByTime(FULL_SCAN_MS);
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("status")).toHaveTextContent(/SCAN_IDLE/);
    expect(screen.queryByRole("button", { name: "Approve Sync" })).not.toBeInTheDocument();
  });

  it("announces progress through a polite live region", () => {
    render(<McpDataFlow />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});
