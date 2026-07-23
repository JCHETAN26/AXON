import { ThemeProvider } from "@axon/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CloudDiscoveryWorkspace } from "./cloud-discovery-workspace";
import { type CloudConnection, type DiscoveredCloudAsset } from "@axon/repo-intel";

const CONNECTIONS: CloudConnection[] = [
  {
    id: "conn-1",
    provider: "aws",
    accountOrProjectId: "123456789012",
    roleArnOrServiceAccount: "arn:aws:iam::123456789012:role/ReadOnlyRole",
    status: "connected",
  },
];

const ASSETS: DiscoveredCloudAsset[] = [
  {
    id: "asset-1",
    provider: "aws",
    resourceType: "aws_db_instance",
    name: "production-postgres",
    region: "us-east-1",
    accountOrProjectId: "123456789012",
    reconciliationStatus: "matched",
    discoveredAt: "2026-04-01T00:00:00.000Z",
  },
];

function renderWorkspace(overrides: Partial<Parameters<typeof CloudDiscoveryWorkspace>[0]> = {}) {
  const props = {
    connections: CONNECTIONS,
    assets: ASSETS,
    onRegisterConnection: vi.fn().mockResolvedValue(undefined),
    onRunDiscovery: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(
    <ThemeProvider>
      <CloudDiscoveryWorkspace {...props} />
    </ThemeProvider>
  );
  return props;
}

describe("CloudDiscoveryWorkspace", () => {
  it("renders cloud discovery header and asset inventory", () => {
    renderWorkspace();

    expect(screen.getByText("Read-Only Cloud Discovery & Reconciliation Ledger")).toBeVisible();
    expect(screen.getByText("production-postgres")).toBeVisible();
    expect(screen.getByRole("button", { name: /RUN READ-ONLY DISCOVERY/ })).toBeEnabled();
  });

  it("triggers discovery callback when discovery button is clicked", async () => {
    const user = userEvent.setup();
    const props = renderWorkspace();

    await user.click(screen.getByRole("button", { name: /RUN READ-ONLY DISCOVERY/ }));
    expect(props.onRunDiscovery).toHaveBeenCalledWith("conn-1");
  });
});
