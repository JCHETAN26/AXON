import {
  BASELINE_SCENARIO,
  SIMULATION_DISCLAIMER,
  runSimulation,
  type ProjectSimulationState,
} from "@axon/architecture-simulation";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SimulationWorkspace } from "./simulation-workspace";
import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";
import { buildSimulationState, initialProfile } from "@/lib/simulation/simulation-view";

const NOW = "2026-03-01T00:00:00.000Z";

const DOCUMENT = createSampleArchitectureDocument({
  id: "doc-1",
  projectId: "project-1",
  now: NOW,
});

const STATE = buildSimulationState({
  document: DOCUMENT,
  scenario: BASELINE_SCENARIO,
  profile: initialProfile(),
  result: runSimulation({ document: DOCUMENT, scenario: BASELINE_SCENARIO }),
  now: NOW,
});

describe("SimulationWorkspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the disclaimer prominently before any run", () => {
    render(
      <SimulationWorkspace
        document={DOCUMENT}
        simulationState={null}
        onSimulationStateChange={vi.fn()}
      />,
    );
    expect(screen.getByText(SIMULATION_DISCLAIMER)).toBeVisible();
    expect(screen.getByRole("status", { name: "Simulation status" })).toHaveTextContent(/NOT_RUN/);
    expect(screen.getByText("This project has not been simulated yet.")).toBeVisible();
  });

  it("runs the simulation and persists the inputs", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <SimulationWorkspace
        document={DOCUMENT}
        simulationState={null}
        onSimulationStateChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Run Simulation" }));
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
    });
    const saved = onChange.mock.calls[0]?.[0] as ProjectSimulationState;
    expect(saved.scenario.id).toBe("baseline");
    // Inputs plus a summary of the run they produced; full results are always
    // recomputed, never restored from storage.
    expect(saved).not.toHaveProperty("components");
    expect(saved.profile.version).toBe("1.0.0");
    expect(saved.latestRun?.scenarioId).toBe("baseline");
    expect(saved.latestRun?.components.length).toBeGreaterThan(0);
    expect(window.localStorage.getItem("axon.simulation.v1.project-1")).not.toBeNull();
  });

  it("reports the first projected constraint and per-component estimates", () => {
    render(
      <SimulationWorkspace
        document={DOCUMENT}
        simulationState={STATE}
        onSimulationStateChange={vi.fn()}
      />,
    );
    expect(screen.getByText("First projected constraint")).toBeVisible();
    expect(screen.getByText("Scenario Cost Impact")).toBeVisible();
    expect(screen.getByText(/scenario-derived usage for non-fixed drivers/i)).toBeVisible();
    expect(screen.getByText(/Projected to reach its modeled limit at approximately/)).toBeVisible();
    expect(screen.getByText("Components (12)")).toBeVisible();
    expect(screen.getByRole("status", { name: "Simulation status" })).toHaveTextContent(
      /UP_TO_DATE/,
    );
  });

  it("opens the component inspector with basis-labelled evidence", async () => {
    const user = userEvent.setup();
    render(
      <SimulationWorkspace
        document={DOCUMENT}
        simulationState={STATE}
        onSimulationStateChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /postgresql/ }));
    expect(screen.getByText("Modeled load")).toBeVisible();
    expect(screen.getByText("Evidence")).toBeVisible();
    // Values distinguish AXON defaults from derived and projected numbers.
    expect(screen.getAllByText("AXON default assumption").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Projected result").length).toBeGreaterThan(0);
    expect(screen.getByText("What this model does not represent")).toBeVisible();
    expect(screen.getByText(/Requires production validation/)).toBeVisible();
    // Confidence is shown and explained.
    expect(screen.getByText("Confidence")).toBeVisible();
    expect(screen.getByText(/High confidence|Medium confidence|Low confidence/)).toBeVisible();
  });

  it("edits a component's capacity assumptions and bumps the profile revision", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <SimulationWorkspace
        document={DOCUMENT}
        simulationState={STATE}
        onSimulationStateChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /postgresql/ }));
    const limit = screen.getByLabelText("Connection limit");
    await user.clear(limit);
    await user.type(limit, "1000");
    await user.click(screen.getByRole("button", { name: "Save assumptions" }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
    const saved = onChange.mock.calls.at(-1)?.[0] as ProjectSimulationState;
    expect(saved.profile.capacityProfile.components["postgres"]).toEqual({ maxConnections: 1000 });
    // Editing assumptions advances the revision past the baseline STATE's.
    expect(saved.profile.revision).toBeGreaterThan(STATE.profile.revision);
  });

  it("attributes the sample architecture's own capacity notes to the architecture", async () => {
    const user = userEvent.setup();
    render(
      <SimulationWorkspace
        document={DOCUMENT}
        simulationState={STATE}
        onSimulationStateChange={vi.fn()}
      />,
    );

    // The sample states "conn 82/300" on postgresql, so the connection limit
    // is the user's own assumption — not an AXON default.
    await user.click(screen.getByRole("button", { name: /postgresql/ }));
    expect(screen.getAllByText("Architecture-provided assumption").length).toBeGreaterThan(0);
  });

  it("switches scenarios and persists the new one", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <SimulationWorkspace
        document={DOCUMENT}
        simulationState={STATE}
        onSimulationStateChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Peak burst/ }));
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
    });
    expect((onChange.mock.calls[0]?.[0] as ProjectSimulationState).scenario.id).toBe("burst");
  });

  it("flags a stale simulation after the architecture changed", () => {
    render(
      <SimulationWorkspace
        document={{ ...DOCUMENT, updatedAt: "2026-03-05T00:00:00.000Z" }}
        simulationState={STATE}
        onSimulationStateChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("status", { name: "Simulation status" })).toHaveTextContent(
      /ARCHITECTURE_CHANGED/,
    );
    expect(screen.getByRole("button", { name: "Rerun Simulation" })).toBeVisible();
  });
});
