import { ThemeProvider } from "@axon/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IaCReviewWorkspace } from "./iac-review-workspace";
import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";
import { type ArchitectureProposal } from "@axon/repo-intel";

const NOW = "2026-04-01T00:00:00.000Z";

const DOCUMENT = createSampleArchitectureDocument({
  id: "doc-1",
  projectId: "project-1",
  now: NOW,
});

const PROPOSAL: ArchitectureProposal = {
  schemaVersion: "1.0",
  sourceRepositoryFullName: "org/sample-repo",
  sourceCommitSha: "a1b2c3d",
  components: [
    {
      id: "comp-1",
      name: "AWS RDS PostgreSQL",
      category: "database",
      technology: "aws_db_instance",
      confidence: "high",
      evidenceIds: ["ev-1"],
      review: "proposed",
    },
    {
      id: "comp-2",
      name: "AWS SQS Queue",
      category: "queue",
      technology: "aws_sqs_queue",
      confidence: "high",
      evidenceIds: ["ev-2"],
      review: "proposed",
    },
  ],
  relationships: [],
  conflicts: [],
  unresolved: [],
  createdAt: NOW,
};

function renderWorkspace(overrides: Partial<Parameters<typeof IaCReviewWorkspace>[0]> = {}) {
  const props = {
    projectId: "project-1",
    document: DOCUMENT,
    proposal: PROPOSAL,
    onApplyProposal: vi.fn(),
    ...overrides,
  };
  render(
    <ThemeProvider>
      <IaCReviewWorkspace {...props} />
    </ThemeProvider>
  );
  return props;
}

describe("IaCReviewWorkspace", () => {
  it("renders proposed components and metadata", () => {
    renderWorkspace();

    expect(screen.getByText("IaC & Repository Architecture Proposal")).toBeVisible();
    expect(screen.getAllByText("AWS RDS PostgreSQL")[0]).toBeVisible();
    expect(screen.getByText("AWS SQS Queue")).toBeVisible();
  });

  it("allows selecting a component and updating its review status", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: /AWS RDS PostgreSQL/ }));
    expect(screen.getByRole("complementary")).toBeVisible();

    const acceptButton = screen.getByRole("button", { name: "ACCEPT" });
    await user.click(acceptButton);
  });

  it("switches view tabs between proposed, current, and diff", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("tab", { name: "CURRENT" }));
    await user.click(screen.getByRole("tab", { name: "DIFF" }));
  });

  it("shows an empty state and disables apply when the proposal has no components", () => {
    renderWorkspace({ proposal: { ...PROPOSAL, components: [] } });
    expect(screen.getByText(/no architecture components/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /APPLY 0 ACCEPTED/ })).toBeDisabled();
  });

  it("keeps apply disabled until at least one component is accepted", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    expect(screen.getByRole("button", { name: /APPLY 0 ACCEPTED/ })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /AWS RDS PostgreSQL/ }));
    await user.click(screen.getByRole("button", { name: "ACCEPT" }));
    expect(screen.getByRole("button", { name: /APPLY 1 ACCEPTED/ })).toBeEnabled();
  });

  it("surfaces a revision-conflict alert without losing the review when apply fails", async () => {
    const user = userEvent.setup();
    const onApplyProposal = vi.fn().mockRejectedValue(
      new Error("The project was modified by another write. Reload and try again."),
    );
    renderWorkspace({ onApplyProposal });

    await user.click(screen.getByRole("button", { name: /AWS RDS PostgreSQL/ }));
    await user.click(screen.getByRole("button", { name: "ACCEPT" }));
    await user.click(screen.getByRole("button", { name: /APPLY 1 ACCEPTED/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/changed elsewhere/i);
    // The accepted review is preserved (apply is still available to retry).
    expect(screen.getByRole("button", { name: /APPLY 1 ACCEPTED/ })).toBeEnabled();
  });
});
