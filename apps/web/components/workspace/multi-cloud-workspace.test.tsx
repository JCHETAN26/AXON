import { createEmptyArchitectureDocument } from "@axon/diagram-schema";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { MultiCloudWorkspace } from "./multi-cloud-workspace";

function fixtureDocument() {
  const doc = createEmptyArchitectureDocument({
    id: "doc-mc",
    projectId: "project-mc",
    name: "Multi-cloud fixture",
    now: "2026-07-23T00:00:00.000Z",
  });
  doc.nodes = [
    { id: "app", name: "App", category: "compute", meta: "aws_instance" },
    { id: "queue", name: "Queue", category: "queue", meta: "aws_sqs_queue" },
  ];
  return doc;
}

describe("MultiCloudWorkspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders provider cost comparison and mapping provenance", () => {
    render(<MultiCloudWorkspace document={fixtureDocument()} />);
    expect(screen.getByRole("heading", { name: "Multi-Cloud Workspace" })).toBeVisible();
    expect(screen.getByText("Mapping Table")).toBeVisible();
    expect(screen.getByText(/catalog 2026.07.fixture-v1/)).toBeVisible();
    expect(screen.getByText(/Amazon EC2/)).toBeVisible();
    expect(screen.getByText(/Google Compute Engine/)).toBeVisible();
    expect(screen.getByText("partial-equivalent")).toBeVisible();
    expect(screen.getByText(/no live cloud inventory/i)).toBeVisible();
  });

  it("updates target provider mappings", async () => {
    const user = userEvent.setup();
    render(<MultiCloudWorkspace document={fixtureDocument()} />);
    await user.selectOptions(screen.getByLabelText("Target Provider"), "azure");
    expect(screen.getByText(/Azure Virtual Machines/)).toBeVisible();
  });

  it("persists explicit target selections for component mappings", async () => {
    const user = userEvent.setup();
    render(<MultiCloudWorkspace document={fixtureDocument()} />);

    await user.selectOptions(screen.getByLabelText("Target selection for Queue"), "gcp.pubsub");

    expect(await screen.findByText("user-selected")).toBeVisible();
    await waitFor(() => {
      expect(window.localStorage.getItem("axon.multicloud.v1.project-mc")).toContain(
        "\"queue\":\"gcp.pubsub\"",
      );
    });
  });
});
