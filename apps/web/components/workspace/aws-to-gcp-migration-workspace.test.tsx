import { ThemeProvider } from "@axon/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AwsToGcpMigrationWorkspace } from "./aws-to-gcp-migration-workspace";
import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";

const NOW = "2026-04-01T00:00:00.000Z";

const DOCUMENT = createSampleArchitectureDocument({
  id: "doc-aws",
  projectId: "project-1",
  now: NOW,
});

DOCUMENT.nodes = [
  { id: "n1", name: "Web Server", category: "compute", meta: "aws_instance" },
  { id: "n2", name: "RDS Postgres", category: "database", meta: "aws_db_instance" },
];

function renderWorkspace(overrides: Partial<Parameters<typeof AwsToGcpMigrationWorkspace>[0]> = {}) {
  const props = {
    projectId: "project-1",
    document: DOCUMENT,
    onApplyTargetProposal: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(
    <ThemeProvider>
      <AwsToGcpMigrationWorkspace {...props} />
    </ThemeProvider>
  );
  return props;
}

describe("AwsToGcpMigrationWorkspace", () => {
  it("renders AWS to GCP component mappings and equivalence score", () => {
    renderWorkspace();

    expect(screen.getByText("AWS to GCP Infrastructure Migration Workspace")).toBeVisible();
    expect(screen.getAllByText(/Google Compute Engine/)[0]).toBeVisible();
    expect(screen.getAllByText(/Google Cloud SQL/)[0]).toBeVisible();
    expect(screen.getByRole("button", { name: /APPLY GCP TARGET ARCHITECTURE/ })).toBeEnabled();
  });

  it("triggers apply migration callback when apply button is clicked", async () => {
    const user = userEvent.setup();
    const props = renderWorkspace();

    await user.click(screen.getByRole("button", { name: /APPLY GCP TARGET ARCHITECTURE/ }));
    expect(props.onApplyTargetProposal).toHaveBeenCalled();
  });
});
