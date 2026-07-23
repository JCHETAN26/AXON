import { ThemeProvider } from "@axon/ui";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SharingWorkspace } from "./sharing-workspace";

describe("SharingWorkspace", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists existing share links", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        shareLinks: [
          {
            id: "share-1",
            role: "viewer",
            label: "Design review",
            createdAt: "2026-07-23T00:00:00.000Z",
          },
        ],
      }),
    );

    render(
      <ThemeProvider>
        <SharingWorkspace projectId="project-1" />
      </ThemeProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Sharing" })).toBeVisible();
    expect(await screen.findByText("Design review")).toBeVisible();
    expect(screen.getByText(/VIEWER/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Revoke" })).toBeVisible();
  });

  it("creates a share link and shows the raw token once", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ shareLinks: [] }))
      .mockResolvedValueOnce(
        Response.json(
          {
            shareLink: {
              id: "share-1",
              role: "commenter",
              label: "Advisor",
              rawToken: "one-time-token",
              createdAt: "2026-07-23T00:00:00.000Z",
            },
          },
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({
          shareLinks: [
            {
              id: "share-1",
              role: "commenter",
              label: "Advisor",
              createdAt: "2026-07-23T00:00:00.000Z",
            },
          ],
        }),
      );

    render(
      <ThemeProvider>
        <SharingWorkspace projectId="project-1" />
      </ThemeProvider>,
    );

    await user.selectOptions(await screen.findByLabelText("Role"), "commenter");
    await user.type(screen.getByLabelText("Label"), "Advisor");
    await user.click(screen.getByRole("button", { name: "Create Link" }));

    expect(await screen.findByText("one-time-token")).toBeVisible();
    expect(await screen.findByText("Advisor")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/projects/project-1/share-links",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ role: "commenter", label: "Advisor" }),
      }),
    );
  });

  it("revokes an active share link", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({
          shareLinks: [
            {
              id: "share-1",
              role: "viewer",
              label: "Review",
              createdAt: "2026-07-23T00:00:00.000Z",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(Response.json({ revoked: true }))
      .mockResolvedValueOnce(Response.json({ shareLinks: [] }));

    render(
      <ThemeProvider>
        <SharingWorkspace projectId="project-1" />
      </ThemeProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "Revoke" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/projects/project-1/share-links/share-1",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });
});
