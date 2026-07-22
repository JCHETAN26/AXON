import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { ProjectList } from "./project-list";
import { getProjectRepository } from "@/lib/projects/get-repository";

describe("ProjectList", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the empty state with a creation link", async () => {
    render(<ProjectList />);
    expect(await screen.findByText("No projects yet.")).toBeVisible();
    expect(screen.getByRole("link", { name: "New Project" })).toHaveAttribute(
      "href",
      "/projects/new",
    );
  });

  it("lists persisted projects with open links", async () => {
    const created = await getProjectRepository().createProject({
      name: "Payments revamp",
      template: "sample",
    });
    render(<ProjectList />);
    expect(await screen.findByRole("link", { name: "Payments revamp" })).toHaveAttribute(
      "href",
      `/projects/${created.project.id}`,
    );
  });

  it("deletes a project", async () => {
    const user = userEvent.setup();
    await getProjectRepository().createProject({ name: "Disposable", template: "blank" });
    render(<ProjectList />);
    await screen.findByRole("link", { name: "Disposable" });
    await user.click(screen.getByRole("button", { name: /Delete project Disposable/ }));
    // Deletion now requires explicit confirmation with the infrastructure note.
    expect(await screen.findByText(/does not change deployed infrastructure/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Delete project" }));
    expect(await screen.findByText("No projects yet.")).toBeVisible();
    await expect(getProjectRepository().listProjects()).resolves.toEqual([]);
  });
});
