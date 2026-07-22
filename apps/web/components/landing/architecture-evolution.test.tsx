import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ArchitectureEvolution } from "./architecture-evolution";

function getPanel() {
  return screen.getByRole("tabpanel");
}

describe("ArchitectureEvolution", () => {
  it("renders three accessible views with Current selected by default", () => {
    render(<ArchitectureEvolution />);
    const tablist = screen.getByRole("tablist", { name: "Architecture views" });
    expect(within(tablist).getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByRole("tab", { name: "Current" })).toHaveAttribute("aria-selected", "true");
    // Baseline weaknesses are visible, and recommended nodes are not.
    expect(
      screen.getAllByText("Authentication service deployed as a single instance").length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("pgbouncer")).not.toBeInTheDocument();
  });

  it("shows the derived recommended architecture with change reasons", async () => {
    const user = userEvent.setup();
    render(<ArchitectureEvolution />);
    await user.click(screen.getByRole("tab", { name: "Recommended" }));
    const panel = getPanel();
    for (const name of ["health-aware-lb", "pgbouncer", "pg-read-replica", "dead-letter-queue"]) {
      expect(within(panel).getAllByText(name).length).toBeGreaterThan(0);
    }
    expect(within(panel).getByText("Reduce connection demand on PostgreSQL.")).toBeInTheDocument();
    // Planned treatment for the failover region.
    expect(within(panel).getAllByText(/Planned/).length).toBeGreaterThan(0);
  });

  it("shows added and removed connections in the diff view", async () => {
    const user = userEvent.setup();
    render(<ArchitectureEvolution />);
    await user.click(screen.getByRole("tab", { name: "Diff" }));
    const panel = getPanel();
    const connectionList = within(panel).getByText("Connection changes").parentElement;
    expect(connectionList).not.toBeNull();
    expect(within(panel).getAllByText(/Removed/).length).toBeGreaterThan(0);
    expect(within(panel).getAllByText(/Added/).length).toBeGreaterThan(0);
    expect(within(panel).getByText("api-gateway → auth-service (sync)")).toBeInTheDocument();
  });

  it("moves between views with arrow keys", async () => {
    const user = userEvent.setup();
    render(<ArchitectureEvolution />);
    const currentTab = screen.getByRole("tab", { name: "Current" });
    await user.click(currentTab);
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Recommended" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Recommended" })).toHaveFocus();
  });

  it("labels the preview honestly", () => {
    render(<ArchitectureEvolution />);
    expect(screen.getByText("Interactive architecture preview")).toBeVisible();
    expect(screen.getByText(/no infrastructure or code has been modified/)).toBeVisible();
  });
});
