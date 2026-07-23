import { ThemeProvider } from "@axon/ui";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PresentationWorkspace } from "./presentation-workspace";
import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";

const DOCUMENT = createSampleArchitectureDocument({
  id: "doc-1",
  projectId: "project-1",
  now: "2026-03-01T00:00:00.000Z",
});

describe("PresentationWorkspace", () => {
  it("renders a read-only architecture walkthrough", () => {
    render(
      <ThemeProvider>
        <PresentationWorkspace document={DOCUMENT} />
      </ThemeProvider>,
    );

    expect(screen.getByRole("heading", { name: "Presentation Mode" })).toBeVisible();
    expect(screen.getByText("Step 1 of 14")).toBeVisible();
    expect(screen.getByRole("heading", { name: "SaaS reference architecture" })).toBeVisible();
    expect(screen.getByLabelText("SaaS reference architecture presentation diagram")).toBeVisible();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Export Walkthrough HTML" })).toBeVisible();
  });

  it("advances through generated presentation steps", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <PresentationWorkspace document={DOCUMENT} />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 2 of 14")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Public Edge" })).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "14" }));
    expect(screen.getByRole("heading", { name: "Model Inputs" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});
