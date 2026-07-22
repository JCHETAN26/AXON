import { ThemeProvider } from "@axon/ui";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ImportWorkspace } from "./import-workspace";
import { createEmptyArchitectureDocument } from "@axon/diagram-schema";
import { getProjectRepository } from "@/lib/projects/get-repository";
import { SAMPLE_COMPOSE } from "@/lib/import/test-support/compose";

function emptyDocument(projectId: string, documentId: string) {
  return createEmptyArchitectureDocument({
    id: documentId,
    projectId,
    name: "Importable",
    now: "2026-06-01T00:00:00.000Z",
  });
}

function renderWorkspace(overrides: Partial<Parameters<typeof ImportWorkspace>[0]> = {}) {
  const props = {
    projectId: "project-1",
    document: emptyDocument("project-1", "doc-1"),
    initialText: "",
    initialOverrides: {},
    onImported: vi.fn(),
    ...overrides,
  };
  render(
    <ThemeProvider>
      <ImportWorkspace {...props} />
    </ThemeProvider>,
  );
  return props;
}

describe("ImportWorkspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the disclaimer prominently", () => {
    renderWorkspace();
    expect(
      screen.getByText("Imported from configuration—not verified against a running environment."),
    ).toBeVisible();
  });

  it("parses a pasted document and lists detected services and warnings", async () => {
    const user = userEvent.setup();
    renderWorkspace({ initialText: SAMPLE_COMPOSE });

    await user.click(screen.getByRole("button", { name: "Parse Compose" }));

    expect(screen.getByRole("status", { name: "Import status" })).toHaveTextContent(/DETECTED/);
    const table = screen.getByRole("region", { name: "Detected services" });
    expect(within(table).getByText("db")).toBeVisible();
    expect(within(table).getByText("gateway")).toBeVisible();
    // A build service produces a warning that is surfaced, not swallowed.
    expect(screen.getByRole("region", { name: "Import warnings" })).toBeVisible();
  });

  it("reports a parse failure instead of throwing", async () => {
    const user = userEvent.setup();
    renderWorkspace({ initialText: "services: [broken" });
    await user.click(screen.getByRole("button", { name: "Parse Compose" }));
    expect(screen.getByRole("status", { name: "Import status" })).toHaveTextContent(/PARSE_FAILED/);
  });

  it("lets a reviewer correct a classification before importing", async () => {
    const user = userEvent.setup();
    renderWorkspace({ initialText: SAMPLE_COMPOSE });
    await user.click(screen.getByRole("button", { name: "Parse Compose" }));

    await user.selectOptions(screen.getByLabelText("Category for api"), "Compute");
    expect(screen.getByLabelText("Category for api")).toHaveValue("Compute");
  });

  it("imports through the repository only on explicit approval", async () => {
    const created = await getProjectRepository().createProject({
      name: "Importable",
      template: "blank",
    });
    const onImported = vi.fn();
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ImportWorkspace
          projectId={created.project.id}
          document={created.document}
          initialText={SAMPLE_COMPOSE}
          initialOverrides={{}}
          onImported={onImported}
        />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Parse Compose" }));
    // Nothing persisted yet — parsing is reversible.
    expect(onImported).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Approve and Import" }));
    await waitFor(() => {
      expect(onImported).toHaveBeenCalledTimes(1);
    });
    const saved = onImported.mock.calls[0]?.[0] as { document: { source: { kind: string } } };
    expect(saved.document.source.kind).toBe("imported");
    // The draft is cleared once approved.
    expect(window.localStorage.getItem(`axon.import.v1.${created.project.id}`)).toBeNull();
  });

  it("persists a draft so a review survives a reload", async () => {
    const user = userEvent.setup();
    renderWorkspace({ initialText: SAMPLE_COMPOSE });
    await user.click(screen.getByRole("button", { name: "Parse Compose" }));
    await waitFor(() => {
      expect(window.localStorage.getItem("axon.import.v1.project-1")).not.toBeNull();
    });
  });
});
