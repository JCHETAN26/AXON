import { createEmptyArchitectureDocument } from "@axon/diagram-schema";
import { ThemeProvider } from "@axon/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { CopilotWorkspace } from "./copilot-workspace";

function fixtureDocument() {
  const doc = createEmptyArchitectureDocument({
    id: "doc-copilot-workspace",
    projectId: "project-copilot-workspace",
    name: "Copilot fixture",
    now: "2026-07-23T00:00:00.000Z",
  });
  doc.nodes = [
    { id: "orders-db", name: "Orders DB", category: "database", meta: "aws_rds_postgres" },
  ];
  return doc;
}

describe("CopilotWorkspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("answers grounded questions and persists the transcript", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <CopilotWorkspace document={fixtureDocument()} auditState={null} />
      </ThemeProvider>,
    );

    await user.type(await screen.findByLabelText("Ask a grounded question"), "what database do we use?");
    await user.click(screen.getByRole("button", { name: "Ask Copilot" }));

    expect(await screen.findByText(/Orders DB is represented as a database/)).toBeVisible();
    expect(screen.getByText("HIGH")).toBeVisible();
    expect(screen.getByRole("link", { name: "component: Orders DB" })).toHaveAttribute(
      "href",
      "/projects/project-copilot-workspace?component=orders-db",
    );
  });

  it("refuses ungrounded questions instead of guessing", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <CopilotWorkspace document={fixtureDocument()} auditState={null} />
      </ThemeProvider>,
    );

    await user.type(await screen.findByLabelText("Ask a grounded question"), "who owns billing?");
    await user.click(screen.getByRole("button", { name: "Ask Copilot" }));

    expect(
      await screen.findByText("I do not have enough grounded AXON context to answer that without speculating."),
    ).toBeVisible();
    expect(screen.getByText("INSUFFICIENT")).toBeVisible();
  });
});
