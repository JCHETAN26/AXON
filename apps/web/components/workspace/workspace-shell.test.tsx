import { ThemeProvider } from "@axon/ui";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { WorkspaceShell } from "./workspace-shell";
import { getProjectRepository } from "@/lib/projects/get-repository";

describe("WorkspaceShell", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows a not-found state for unknown projects", async () => {
    render(
      <ThemeProvider>
        <WorkspaceShell projectId="does-not-exist" />
      </ThemeProvider>,
    );
    expect(await screen.findByText("Project not found.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to Projects" })).toHaveAttribute(
      "href",
      "/projects",
    );
  });

  it("renders a sample project from the persisted document", async () => {
    const created = await getProjectRepository().createProject({
      name: "Checkout platform",
      template: "sample",
    });
    render(
      <ThemeProvider>
        <WorkspaceShell projectId={created.project.id} />
      </ThemeProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Checkout platform" })).toBeVisible();
    expect(screen.getByText(/12 services · 12 connections/)).toBeVisible();
    // The node appears on the canvas and in the mobile read-only summary.
    expect(screen.getAllByText("postgresql").length).toBeGreaterThan(0);
    expect(screen.getByText("Sample: SaaS reference architecture")).toBeVisible();
    // Canvas and Audit are real tabs; the rest stay labelled as planned.
    expect(screen.getByRole("tab", { name: "Canvas" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Audit" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Simulate" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Multi-cloud" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tab", { name: "Icons" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Present" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Share" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Comments" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Approvals" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tab", { name: "Recommend" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tab", { name: "Import" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getAllByText("Planned")).toHaveLength(1);
    expect(screen.getByText(/edits autosave locally/)).toBeVisible();
    // The editor surface is present with its save state.
    expect(screen.getByRole("status", { name: "Save status" })).toHaveTextContent(/SAVED/);
    expect(screen.getByRole("toolbar", { name: "Canvas tools" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview Layout" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Export SVG" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Export PNG" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Export HTML" })).toBeVisible();
  });

  it("switches to the icon registry workspace tab", async () => {
    const created = await getProjectRepository().createProject({
      name: "Icon catalog",
      template: "sample",
    });
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <WorkspaceShell projectId={created.project.id} />
      </ThemeProvider>,
    );

    await user.click(await screen.findByRole("tab", { name: "Icons" }));
    expect(screen.getByRole("tab", { name: "Icons" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Icon Registry" })).toBeVisible();
    expect(screen.getByLabelText("Search")).toBeVisible();
  });

  it("switches to the presentation workspace tab", async () => {
    const created = await getProjectRepository().createProject({
      name: "Presentable",
      template: "sample",
    });
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <WorkspaceShell projectId={created.project.id} />
      </ThemeProvider>,
    );

    await user.click(await screen.findByRole("tab", { name: "Present" }));
    expect(screen.getByRole("tab", { name: "Present" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Presentation Mode" })).toBeVisible();
  });

  it("switches to the sharing workspace tab", async () => {
    const created = await getProjectRepository().createProject({
      name: "Shareable",
      template: "sample",
    });
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <WorkspaceShell projectId={created.project.id} />
      </ThemeProvider>,
    );

    await user.click(await screen.findByRole("tab", { name: "Share" }));
    expect(screen.getByRole("tab", { name: "Share" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Sharing" })).toBeVisible();
  });

  it("switches to the comments workspace tab", async () => {
    const created = await getProjectRepository().createProject({
      name: "Discussable",
      template: "sample",
    });
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <WorkspaceShell projectId={created.project.id} />
      </ThemeProvider>,
    );

    await user.click(await screen.findByRole("tab", { name: "Comments" }));
    expect(screen.getByRole("tab", { name: "Comments" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Comments" })).toBeVisible();
  });

  it("switches to the approvals workspace tab", async () => {
    const created = await getProjectRepository().createProject({
      name: "Approvable",
      template: "sample",
    });
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <WorkspaceShell projectId={created.project.id} />
      </ThemeProvider>,
    );

    await user.click(await screen.findByRole("tab", { name: "Approvals" }));
    expect(screen.getByRole("tab", { name: "Approvals" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Approvals" })).toBeVisible();
  });

  it("switches to the audit workspace tab", async () => {
    const created = await getProjectRepository().createProject({
      name: "Audit me",
      template: "sample",
    });
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <WorkspaceShell projectId={created.project.id} />
      </ThemeProvider>,
    );

    await user.click(await screen.findByRole("tab", { name: "Audit" }));
    expect(screen.getByRole("tab", { name: "Audit" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Run Audit" })).toBeVisible();
    expect(screen.getByRole("status", { name: "Audit status" })).toHaveTextContent(/NEVER_RUN/);
  });

  it("switches to the simulation workspace tab", async () => {
    const created = await getProjectRepository().createProject({
      name: "Simulate me",
      template: "sample",
    });
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <WorkspaceShell projectId={created.project.id} />
      </ThemeProvider>,
    );

    await user.click(await screen.findByRole("tab", { name: "Simulate" }));
    expect(screen.getByRole("tab", { name: "Simulate" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Run Simulation" })).toBeVisible();
    expect(
      screen.getByText(
        "Estimated from supplied architecture parameters—not a production benchmark.",
      ),
    ).toBeVisible();
  });

  it("offers prompt-to-architecture generation for blank documents", async () => {
    const created = await getProjectRepository().createProject({
      name: "Fresh",
      template: "blank",
    });
    render(
      <ThemeProvider>
        <WorkspaceShell projectId={created.project.id} />
      </ThemeProvider>,
    );
    expect(await screen.findByLabelText("Describe the system")).toBeVisible();
    expect(screen.getByRole("button", { name: "Generate Architecture" })).toBeVisible();
  });
});
