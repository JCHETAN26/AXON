import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { IconRegistryWorkspace } from "./icon-registry-workspace";

describe("IconRegistryWorkspace", () => {
  it("renders searchable icon records with provenance", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();

    render(<IconRegistryWorkspace />);

    expect(screen.getByRole("heading", { name: "Icon Registry" })).toBeVisible();
    expect(screen.getByText(/not official provider logos/)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Amazon RDS" })).toBeVisible();

    await user.type(screen.getByLabelText("Search"), "postgres");

    expect(screen.getByRole("heading", { name: "Amazon RDS" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Cloud SQL" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Amazon SQS" })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Provider"), "gcp");
    expect(screen.queryByRole("heading", { name: "Amazon RDS" })).not.toBeInTheDocument();
    const cloudSql = screen.getByRole("heading", { name: "Cloud SQL" }).closest("article");
    expect(cloudSql).not.toBeNull();
    expect(within(cloudSql as HTMLElement).getByText(/axon-generic-registry/)).toBeVisible();
  });

  it("reports empty filtered results without guessing", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();

    render(<IconRegistryWorkspace />);

    await user.type(screen.getByLabelText("Search"), "mainframe");
    expect(screen.getByText("No icon records match the current filters.")).toBeVisible();
  });
});
