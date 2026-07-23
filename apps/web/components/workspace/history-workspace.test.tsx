import { ThemeProvider } from "@axon/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HistoryWorkspace } from "./history-workspace";
import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";
import { type ArchitectureSnapshot } from "@axon/diagram-schema";

const NOW = "2026-04-01T00:00:00.000Z";

const DOCUMENT = createSampleArchitectureDocument({
  id: "doc-1",
  projectId: "project-1",
  now: NOW,
});

const SNAPSHOTS: ArchitectureSnapshot[] = [
  {
    id: "snap-1",
    projectId: "project-1",
    documentVersion: 1,
    payload: DOCUMENT,
    creationReason: "manual-snapshot",
    semanticHash: "abc123hash",
    status: "active",
    createdAt: NOW,
  },
];

function renderWorkspace(overrides: Partial<Parameters<typeof HistoryWorkspace>[0]> = {}) {
  const props = {
    projectId: "project-1",
    document: DOCUMENT,
    snapshots: SNAPSHOTS,
    driftItems: [],
    onRestoreSnapshot: vi.fn(),
    onResolveDrift: vi.fn(),
    ...overrides,
  };
  render(
    <ThemeProvider>
      <HistoryWorkspace {...props} />
    </ThemeProvider>
  );
  return props;
}

describe("HistoryWorkspace", () => {
  it("renders snapshot timeline and metadata", () => {
    renderWorkspace();

    expect(screen.getByText("Architecture History & Drift Ledger")).toBeVisible();
    expect(screen.getByText(/v1 · manual-snapshot/)).toBeVisible();
    expect(screen.getByRole("button", { name: /RESTORE SNAPSHOT/ })).toBeEnabled();
  });

  it("triggers restore when restore button is clicked", async () => {
    const user = userEvent.setup();
    const props = renderWorkspace();

    await user.click(screen.getByRole("button", { name: /RESTORE SNAPSHOT/ }));
    expect(props.onRestoreSnapshot).toHaveBeenCalledWith("snap-1");
  });
});
