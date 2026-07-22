import { ThemeProvider } from "@axon/ui";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RecommendationWorkspace } from "./recommendation-workspace";
import { computeNextAuditState } from "@/lib/audit/run-project-audit";
import { getProjectRepository } from "@/lib/projects/get-repository";
import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";

const NOW = "2026-04-01T00:00:00.000Z";

const DOCUMENT = createSampleArchitectureDocument({
  id: "doc-1",
  projectId: "project-1",
  now: NOW,
});

const AUDIT = computeNextAuditState({ document: DOCUMENT, previous: null, now: NOW });

function renderWorkspace(overrides: Partial<Parameters<typeof RecommendationWorkspace>[0]> = {}) {
  const props = {
    projectId: "project-1",
    document: DOCUMENT,
    auditState: AUDIT,
    recommendationState: null,
    onApplied: vi.fn(),
    ...overrides,
  };
  render(
    <ThemeProvider>
      <RecommendationWorkspace {...props} />
    </ThemeProvider>,
  );
  return props;
}

describe("RecommendationWorkspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("requires an audit before offering recommendations", () => {
    renderWorkspace({ auditState: null });
    expect(screen.getByText("No audit findings yet.")).toBeVisible();
    expect(screen.getByText(/derived from audit findings/)).toBeVisible();
  });

  it("lists recommendations derived from the persisted findings", () => {
    renderWorkspace();
    expect(screen.getByText("Recommendations (5)")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Represent a dead-letter path for "rabbitmq"/ }),
    ).toBeVisible();
    expect(screen.getAllByText("Manual review").length).toBe(3);
  });

  it("shows the evidence trail and links back to the source finding", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(
      screen.getByRole("button", { name: /Represent a dead-letter path for "rabbitmq"/ }),
    );
    const inspector = screen.getByRole("complementary", { name: "Change inspector" });
    expect(within(inspector).getByText("Triggered by")).toBeVisible();
    expect(
      within(inspector).getByText('No dead-letter path is represented for "rabbitmq"'),
    ).toBeVisible();
    expect(within(inspector).getByText("Proposed change")).toBeVisible();
    expect(within(inspector).getByText("Expected effect")).toBeVisible();
    expect(within(inspector).getByText("Assumptions and limitations")).toBeVisible();
    expect(within(inspector).getByText(/Preview only/)).toBeVisible();
    expect(within(inspector).getByRole("button", { name: "Review and Apply" })).toBeEnabled();
  });

  it("never enables an apply action for manual-review recommendations", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: /Review redundancy for "api-gateway"/ }));
    const inspector = screen.getByRole("complementary", { name: "Change inspector" });
    expect(
      within(inspector).queryByRole("button", { name: "Review and Apply" }),
    ).not.toBeInTheDocument();
    expect(within(inspector).getByText(/does not apply this change automatically/)).toBeVisible();
  });

  it("disables apply when the audit is stale, with no way to override", async () => {
    const user = userEvent.setup();
    renderWorkspace({ document: { ...DOCUMENT, updatedAt: "2026-04-09T00:00:00.000Z" } });

    expect(screen.getByRole("status", { name: "Recommendation status" })).toHaveTextContent(
      /AUDIT_STALE/,
    );
    await user.click(
      screen.getByRole("button", { name: /Represent a dead-letter path for "rabbitmq"/ }),
    );
    const inspector = screen.getByRole("complementary", { name: "Change inspector" });
    expect(within(inspector).getByRole("button", { name: "Review and Apply" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /apply anyway/i })).not.toBeInTheDocument();
  });

  it("requires explicit approval and applies through the repository", async () => {
    const created = await getProjectRepository().createProject({
      name: "Applyable",
      template: "sample",
    });
    const auditState = computeNextAuditState({
      document: created.document,
      previous: null,
      now: NOW,
    });
    const onApplied = vi.fn();
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <RecommendationWorkspace
          projectId={created.project.id}
          document={created.document}
          auditState={auditState}
          recommendationState={null}
          onApplied={onApplied}
        />
      </ThemeProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: /Represent a dead-letter path for "rabbitmq"/ }),
    );
    await user.click(screen.getByRole("button", { name: "Review and Apply" }));

    // A dialog appears; nothing is written until it is confirmed.
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Apply architecture-document change?")).toBeVisible();
    expect(within(dialog).getByText(/does not change infrastructure, source code/)).toBeVisible();
    expect(onApplied).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Apply Change" }));
    await waitFor(() => {
      expect(onApplied).toHaveBeenCalledTimes(1);
    });

    const saved = onApplied.mock.calls[0]?.[0] as { document: { nodes: { id: string }[] } };
    expect(saved.document.nodes.some((node) => node.id === "rabbitmq-dead-letter")).toBe(true);
  });

  it("cancelling the dialog leaves the document untouched", async () => {
    const user = userEvent.setup();
    const props = renderWorkspace();

    await user.click(
      screen.getByRole("button", { name: /Represent a dead-letter path for "rabbitmq"/ }),
    );
    await user.click(screen.getByRole("button", { name: "Review and Apply" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(props.onApplied).not.toHaveBeenCalled();
  });

  it("switches between current, recommended, and diff views", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(
      screen.getByRole("button", { name: /Represent a dead-letter path for "rabbitmq"/ }),
    );
    await user.click(screen.getByRole("tab", { name: "Diff" }));
    // The summary appears in the comparison view and again in the inspector.
    const comparison = screen.getByRole("region", { name: "Architecture comparison" });
    expect(within(comparison).getByText(/2 added · 0 modified · 0 removed/)).toBeVisible();
  });
});
