import { ThemeProvider } from "@axon/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ControlledInfrastructurePrWorkspace, type ControlledPrItem } from "./controlled-infrastructure-pr-workspace";
import { type ArchitectureProposal } from "@axon/repo-intel";

const PROPOSAL: ArchitectureProposal = {
  schemaVersion: "1.0",
  sourceRepositoryFullName: "org/repo",
  sourceCommitSha: "sha123",
  components: [
    {
      id: "comp-1",
      name: "API Service",
      category: "compute",
      technology: "aws_instance",
      confidence: "high",
      evidenceIds: ["ev-1"],
      review: "accepted",
    },
  ],
  relationships: [],
  conflicts: [],
  unresolved: [],
  createdAt: "2026-04-01T00:00:00Z",
};

const PRS: ControlledPrItem[] = [
  {
    id: "pr-1",
    prNumber: 99,
    prUrl: "https://github.com/org/repo/pull/99",
    branchName: "axon/infra-update-12345678",
    targetBranch: "main",
    status: "open",
    createdAt: "2026-04-01T00:00:00.000Z",
  },
];

function renderWorkspace(overrides: Partial<Parameters<typeof ControlledInfrastructurePrWorkspace>[0]> = {}) {
  const props = {
    repositoryFullName: "org/repo",
    proposal: PROPOSAL,
    proposalId: "prop-12345678",
    existingPrs: PRS,
    onSubmitPr: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(
    <ThemeProvider>
      <ControlledInfrastructurePrWorkspace {...props} />
    </ThemeProvider>
  );
  return props;
}

describe("ControlledInfrastructurePrWorkspace", () => {
  it("renders controlled infrastructure PR header and HCL code preview", () => {
    renderWorkspace();

    expect(screen.getByText("Controlled Infrastructure-as-Code Pull Request Generator")).toBeVisible();
    expect(screen.getByText(/resource "aws_instance" "comp_1"/)).toBeVisible();
    expect(screen.getByRole("button", { name: /OPEN INFRASTRUCTURE PULL REQUEST ON GITHUB/ })).toBeEnabled();
  });

  it("triggers PR submission when action button is clicked", async () => {
    const user = userEvent.setup();
    const props = renderWorkspace();

    await user.click(screen.getByRole("button", { name: /OPEN INFRASTRUCTURE PULL REQUEST ON GITHUB/ }));
    expect(props.onSubmitPr).toHaveBeenCalledWith("main");
  });
});
