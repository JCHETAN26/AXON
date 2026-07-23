import { ThemeProvider } from "@axon/ui";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApprovalsWorkspace } from "./approvals-workspace";
import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";

const DOCUMENT = createSampleArchitectureDocument({
  id: "doc-1",
  projectId: "project-1",
  now: "2026-03-01T00:00:00.000Z",
});

describe("ApprovalsWorkspace", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists existing approvals", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        approvals: [
          {
            id: "approval-1",
            subjectKind: "architecture",
            subjectId: "doc-1",
            title: "Approve architecture",
            status: "pending",
            createdAt: "2026-07-23T00:00:00.000Z",
          },
        ],
      }),
    );

    render(
      <ThemeProvider>
        <ApprovalsWorkspace document={DOCUMENT} />
      </ThemeProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Approvals" })).toBeVisible();
    expect(await screen.findByText("Approve architecture")).toBeVisible();
    expect(screen.getByRole("button", { name: "Approve" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Reject" })).toBeVisible();
  });

  it("requests an approval", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ approvals: [] }))
      .mockResolvedValueOnce(
        Response.json(
          {
            approval: {
              id: "approval-1",
              subjectKind: "architecture",
              subjectId: "doc-1",
              title: "Ship it",
              status: "pending",
              createdAt: "2026-07-23T00:00:00.000Z",
            },
          },
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({
          approvals: [
            {
              id: "approval-1",
              subjectKind: "architecture",
              subjectId: "doc-1",
              title: "Ship it",
              status: "pending",
              createdAt: "2026-07-23T00:00:00.000Z",
            },
          ],
        }),
      );

    render(
      <ThemeProvider>
        <ApprovalsWorkspace document={DOCUMENT} />
      </ThemeProvider>,
    );

    await user.clear(await screen.findByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Ship it");
    await user.click(screen.getByRole("button", { name: "Request Approval" }));

    expect(await screen.findByText("Ship it")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/projects/project-1/approvals",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          subjectKind: "architecture",
          subjectId: "doc-1",
          title: "Ship it",
        }),
      }),
    );
  });

  it("decides an approval", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({
          approvals: [
            {
              id: "approval-1",
              subjectKind: "architecture",
              subjectId: "doc-1",
              title: "Approve me",
              status: "pending",
              createdAt: "2026-07-23T00:00:00.000Z",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(Response.json({ approval: { id: "approval-1", status: "approved" } }))
      .mockResolvedValueOnce(Response.json({ approvals: [] }));

    render(
      <ThemeProvider>
        <ApprovalsWorkspace document={DOCUMENT} />
      </ThemeProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/projects/project-1/approvals/approval-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ decision: "approved" }),
        }),
      );
    });
  });
});
