import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NewProjectForm } from "./new-project-form";
import { getProjectRepository } from "@/lib/projects/get-repository";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("NewProjectForm", () => {
  beforeEach(() => {
    pushMock.mockClear();
    window.localStorage.clear();
  });

  it("requires a project name", async () => {
    const user = userEvent.setup();
    render(<NewProjectForm />);
    await user.click(screen.getByRole("button", { name: "Create Project" }));
    expect(screen.getByText(/Give the project a name/)).toBeVisible();
    expect(screen.getByLabelText("Project name")).toHaveAttribute("aria-invalid", "true");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("creates a sample project and navigates to its workspace", async () => {
    const user = userEvent.setup();
    render(<NewProjectForm />);
    await user.type(screen.getByLabelText("Project name"), "Beta walkthrough");
    await user.click(screen.getByRole("radio", { name: /Sample architecture/ }));
    await user.click(screen.getByRole("button", { name: "Create Project" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledTimes(1);
    });
    const projects = await getProjectRepository().listProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0]?.name).toBe("Beta walkthrough");
    expect(pushMock).toHaveBeenCalledWith(`/projects/${projects[0]?.id ?? ""}`);
  });

  it("creates a blank project when selected", async () => {
    const user = userEvent.setup();
    render(<NewProjectForm />);
    await user.type(screen.getByLabelText("Project name"), "Empty start");
    await user.click(screen.getByRole("radio", { name: /^Blank/ }));
    await user.click(screen.getByRole("button", { name: "Create Project" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledTimes(1);
    });
    const projects = await getProjectRepository().listProjects();
    const detail = await getProjectRepository().getProject(projects[0]?.id ?? "");
    expect(detail?.document.nodes).toHaveLength(0);
    expect(detail?.document.source.kind).toBe("manual");
  });
});
