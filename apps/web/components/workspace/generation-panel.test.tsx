import { buildTemplateDraft } from "@axon/architecture-generation";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GenerationPanel } from "./generation-panel";
import { getProjectRepository } from "@/lib/projects/get-repository";

const PROMPT = "A SaaS platform with billing and background jobs";

function offlineFetchResponse() {
  return {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        draft: buildTemplateDraft(PROMPT),
        providerId: "offline-template",
        attempts: 1,
        mode: "offline",
      }),
  } as Response;
}

describe("GenerationPanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function createBlankProject() {
    return getProjectRepository().createProject({ name: "Prompt start", template: "blank" });
  }

  it("validates the prompt before calling the server", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const created = await createBlankProject();
    const user = userEvent.setup();
    render(
      <GenerationPanel
        projectId={created.project.id}
        document={created.document}
        onGenerated={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Generate Architecture" }));
    expect(screen.getByRole("status", { name: "Generation status" })).toHaveTextContent(
      /at least a sentence/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("generates, persists through the repository, and reports back", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(offlineFetchResponse()));
    const created = await createBlankProject();
    const onGenerated = vi.fn();
    const user = userEvent.setup();
    render(
      <GenerationPanel
        projectId={created.project.id}
        document={created.document}
        onGenerated={onGenerated}
      />,
    );
    await user.type(screen.getByLabelText("Describe the system"), PROMPT);
    await user.click(screen.getByRole("button", { name: "Generate Architecture" }));

    await waitFor(() => {
      expect(onGenerated).toHaveBeenCalledTimes(1);
    });
    const persisted = await getProjectRepository().getProject(created.project.id);
    expect(persisted?.document.nodes.length).toBeGreaterThanOrEqual(3);
    expect(persisted?.document.source.kind).toBe("generated");
    // Identity is preserved: same document id, same creation time.
    expect(persisted?.document.id).toBe(created.document.id);
    expect(persisted?.document.createdAt).toBe(created.document.createdAt);
  });

  it("surfaces server errors without persisting anything", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: () => Promise.resolve({ error: "The model could not produce a valid draft." }),
      } as Response),
    );
    const created = await createBlankProject();
    const user = userEvent.setup();
    render(
      <GenerationPanel
        projectId={created.project.id}
        document={created.document}
        onGenerated={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText("Describe the system"), PROMPT);
    await user.click(screen.getByRole("button", { name: "Generate Architecture" }));

    await waitFor(() => {
      expect(screen.getByRole("status", { name: "Generation status" })).toHaveTextContent(
        /GENERATION_FAILED/,
      );
    });
    const persisted = await getProjectRepository().getProject(created.project.id);
    expect(persisted?.document.nodes).toHaveLength(0);
  });
});
