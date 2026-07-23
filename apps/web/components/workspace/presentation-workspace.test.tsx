import { ThemeProvider } from "@axon/ui";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { PresentationWorkspace } from "./presentation-workspace";
import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";

const DOCUMENT = createSampleArchitectureDocument({
  id: "doc-1",
  projectId: "project-1",
  now: "2026-03-01T00:00:00.000Z",
});

describe("PresentationWorkspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

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
    expect(screen.getByText("LOADING_NOTES")).toBeVisible();
    expect(screen.getByLabelText("Speaker Notes")).toBeVisible();
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

  it("saves speaker notes for generated steps", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <PresentationWorkspace document={DOCUMENT} />
      </ThemeProvider>,
    );

    await user.type(await screen.findByLabelText("Speaker Notes"), "Open with the reliability story.");
    await user.click(screen.getByRole("button", { name: "Save Notes" }));

    expect(await screen.findByText("NOTES_SAVED")).toBeVisible();
    expect(window.localStorage.getItem("axon.presentation.v1.project-1")).toContain(
      "Open with the reliability story.",
    );
  });
});
