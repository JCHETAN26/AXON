import { ThemeProvider } from "@axon/ui";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CommentsWorkspace } from "./comments-workspace";
import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";

const DOCUMENT = createSampleArchitectureDocument({
  id: "doc-1",
  projectId: "project-1",
  now: "2026-03-01T00:00:00.000Z",
});

describe("CommentsWorkspace", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists existing comments", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        comments: [
          {
            id: "comment-1",
            body: "Check retry behavior.",
            anchorKind: "node",
            anchorId: "gateway",
            createdAt: "2026-07-23T00:00:00.000Z",
          },
        ],
      }),
    );

    render(
      <ThemeProvider>
        <CommentsWorkspace document={DOCUMENT} />
      </ThemeProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Comments" })).toBeVisible();
    expect(await screen.findByText("Check retry behavior.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Resolve" })).toBeVisible();
  });

  it("creates a comment", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ comments: [] }))
      .mockResolvedValueOnce(
        Response.json(
          {
            comment: {
              id: "comment-1",
              body: "New note.",
              anchorKind: "diagram",
              anchorId: "diagram",
              createdAt: "2026-07-23T00:00:00.000Z",
            },
          },
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({
          comments: [
            {
              id: "comment-1",
              body: "New note.",
              anchorKind: "diagram",
              anchorId: "diagram",
              createdAt: "2026-07-23T00:00:00.000Z",
            },
          ],
        }),
      );

    render(
      <ThemeProvider>
        <CommentsWorkspace document={DOCUMENT} />
      </ThemeProvider>,
    );

    await user.type(await screen.findByLabelText("Comment"), "New note.");
    await user.click(screen.getByRole("button", { name: "Add Comment" }));

    expect(await screen.findByText("New note.")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/projects/project-1/comments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          body: "New note.",
          anchorKind: "diagram",
          anchorId: "diagram",
        }),
      }),
    );
  });

  it("resolves a comment", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({
          comments: [
            {
              id: "comment-1",
              body: "Close me.",
              anchorKind: "diagram",
              anchorId: "diagram",
              createdAt: "2026-07-23T00:00:00.000Z",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(Response.json({ resolved: true }))
      .mockResolvedValueOnce(Response.json({ comments: [] }));

    render(
      <ThemeProvider>
        <CommentsWorkspace document={DOCUMENT} />
      </ThemeProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "Resolve" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/projects/project-1/comments/comment-1",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });
});
