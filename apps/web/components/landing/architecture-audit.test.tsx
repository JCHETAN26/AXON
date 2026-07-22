import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ArchitectureAudit } from "./architecture-audit";
import { DEMO_FINDINGS, EVIDENCE_KIND_LABEL, getNode } from "@/data/demo-architecture";

function getPanel() {
  return screen.getByRole("tabpanel");
}

describe("ArchitectureAudit", () => {
  it("renders one tab per finding from the dataset", () => {
    render(<ArchitectureAudit />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(DEMO_FINDINGS.length);
    for (const finding of DEMO_FINDINGS) {
      expect(screen.getByRole("tab", { name: new RegExp(finding.title) })).toBeInTheDocument();
    }
  });

  it("selects the first finding by default and shows its evidence", () => {
    render(<ArchitectureAudit />);
    const first = DEMO_FINDINGS[0];
    expect(first).toBeDefined();
    if (first === undefined) return;
    expect(screen.getByRole("tab", { name: new RegExp(first.title) })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const panel = getPanel();
    expect(within(panel).getByText(first.recommendation)).toBeVisible();
    expect(within(panel).getByText(`node: ${getNode(first.nodeId).name}`)).toBeVisible();
    expect(within(panel).getByText(`${first.confidence}% confidence`)).toBeVisible();
  });

  it("updates the evidence panel and highlights the node when another finding is selected", async () => {
    const user = userEvent.setup();
    render(<ArchitectureAudit />);
    const postgresFinding = DEMO_FINDINGS.find((finding) => finding.id === "postgres-saturation");
    expect(postgresFinding).toBeDefined();
    if (postgresFinding === undefined) return;

    await user.click(screen.getByRole("tab", { name: new RegExp(postgresFinding.title) }));
    const panel = getPanel();
    expect(within(panel).getByText(postgresFinding.recommendation)).toBeVisible();
    expect(within(panel).getByText("node: postgresql")).toBeVisible();
    // The mini-map marks the affected node as selected.
    expect(screen.getByText("(selected)")).toBeInTheDocument();
  });

  it("classifies every visible evidence item", () => {
    render(<ArchitectureAudit />);
    const first = DEMO_FINDINGS[0];
    if (first === undefined) return;
    const panel = getPanel();
    for (const evidence of first.evidence) {
      const row = within(panel).getByText(evidence.text).closest("li");
      expect(row).not.toBeNull();
      if (row !== null) {
        expect(within(row).getByText(EVIDENCE_KIND_LABEL[evidence.kind])).toBeVisible();
      }
    }
  });

  it("moves selection with arrow keys and keeps focus on the active tab", async () => {
    const user = userEvent.setup();
    render(<ArchitectureAudit />);
    const [first, second] = DEMO_FINDINGS;
    if (first === undefined || second === undefined) return;

    const firstTab = screen.getByRole("tab", { name: new RegExp(first.title) });
    await user.click(firstTab);
    await user.keyboard("{ArrowDown}");

    const secondTab = screen.getByRole("tab", { name: new RegExp(second.title) });
    expect(secondTab).toHaveAttribute("aria-selected", "true");
    expect(secondTab).toHaveFocus();
    expect(within(getPanel()).getByText(second.recommendation)).toBeVisible();
  });
});
