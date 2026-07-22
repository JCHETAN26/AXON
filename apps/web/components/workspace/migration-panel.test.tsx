import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MigrationPanel } from "./migration-panel";
import { LocalStorageProjectRepository } from "@/lib/projects/local-storage-repository";

async function seedLocalProject(name: string) {
  await new LocalStorageProjectRepository().createProject({ name, template: "blank" });
}

beforeEach(() => {
  window.localStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_AXON_PERSISTENCE_MODE", "cloud");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("MigrationPanel", () => {
  it("renders nothing when there are no local projects", async () => {
    const { container } = render(<MigrationPanel />);
    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });

  it("renders nothing in local mode even with local projects", async () => {
    vi.stubEnv("NEXT_PUBLIC_AXON_PERSISTENCE_MODE", "local");
    await seedLocalProject("Local One");
    const { container } = render(<MigrationPanel />);
    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });

  it("migrates only after explicit confirmation", async () => {
    await seedLocalProject("Alpha");
    const user = userEvent.setup();
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        Response.json({ migrated: [{ localName: "Alpha", projectId: "p1" }], skipped: [] }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<MigrationPanel />);
    await screen.findByText("Bring your local projects into your account");

    // First click only asks for confirmation — nothing is sent yet.
    await user.click(screen.getByRole("button", { name: /Migrate 1 project/ }));
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirm migration" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText(/Migrated 1 project into your account/)).toBeVisible();
  });

  it("can be cancelled at the confirmation step", async () => {
    await seedLocalProject("Alpha");
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<MigrationPanel />);
    await user.click(await screen.findByRole("button", { name: /Migrate 1 project/ }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: /Migrate 1 project/ })).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
