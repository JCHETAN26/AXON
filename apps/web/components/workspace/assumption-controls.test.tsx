import { runSimulation, type ComponentResult } from "@axon/architecture-simulation";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AssumptionControls } from "./assumption-controls";
import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";

const DOCUMENT = createSampleArchitectureDocument({
  id: "doc-1",
  projectId: "project-1",
  now: "2026-05-01T00:00:00.000Z",
});
const RESULT = runSimulation({ document: DOCUMENT });

function component(nodeId: string): ComponentResult {
  const found = RESULT.components.find((item) => item.nodeId === nodeId);
  if (found === undefined) throw new Error(`missing ${nodeId}`);
  return found;
}

describe("AssumptionControls", () => {
  it("shows only the fields the component kind models", () => {
    render(
      <AssumptionControls
        component={component("postgres")}
        override={undefined}
        onSave={vi.fn()}
      />,
    );
    // Database: connection fields, not cache hit rate.
    expect(screen.getByLabelText("Connection limit")).toBeVisible();
    expect(screen.getByLabelText("Connections per rps")).toBeVisible();
    expect(screen.queryByLabelText("Cache hit rate (%)")).not.toBeInTheDocument();
  });

  it("pre-fills stored overrides and emits edited values", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <AssumptionControls
        component={component("postgres")}
        override={{ maxConnections: 500 }}
        onSave={onSave}
      />,
    );
    expect(screen.getByLabelText("Connection limit")).toHaveValue(500);

    await user.clear(screen.getByLabelText("Connection limit"));
    await user.type(screen.getByLabelText("Connection limit"), "800");
    await user.click(screen.getByRole("button", { name: "Save assumptions" }));

    expect(onSave).toHaveBeenCalledWith("postgres", { maxConnections: 800 });
  });

  it("treats a cleared field as removing the override, not a zero", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <AssumptionControls
        component={component("postgres")}
        override={{ maxConnections: 500 }}
        onSave={onSave}
      />,
    );
    await user.clear(screen.getByLabelText("Connection limit"));
    await user.click(screen.getByRole("button", { name: "Save assumptions" }));
    // No field set → an empty override, which the workspace treats as "remove".
    expect(onSave).toHaveBeenCalledWith("postgres", {});
  });

  it("explains there is nothing to edit for an unmodeled component", () => {
    // datadog is Observability → unmodeled.
    render(
      <AssumptionControls component={component("datadog")} override={undefined} onSave={vi.fn()} />,
    );
    expect(screen.getByText(/no capacity model/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Save assumptions" })).not.toBeInTheDocument();
  });
});
