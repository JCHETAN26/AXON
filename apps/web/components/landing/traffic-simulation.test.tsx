import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TrafficSimulation } from "./traffic-simulation";
import { METRIC_BASIS_LABEL } from "@/data/simulation";

describe("TrafficSimulation", () => {
  it("starts at the measured healthy baseline", () => {
    render(<TrafficSimulation />);
    expect(screen.getByRole("status", { name: "Simulation status" })).toHaveTextContent(/HEALTHY/);
    expect(screen.getByRole("button", { name: /Current Traffic/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("conn 82/300 · 27%")).toBeInTheDocument();
  });

  it("fails under the Black Friday burst with the constraint identified", async () => {
    const user = userEvent.setup();
    render(<TrafficSimulation />);
    await user.click(screen.getByRole("button", { name: /Black Friday Burst/ }));
    expect(screen.getByRole("status", { name: "Simulation status" })).toHaveTextContent(/FAILING/);
    expect(screen.getByText("Saturated")).toBeVisible();
    expect(screen.getByText(/saturates at ≈/)).toBeVisible();
    expect(screen.getByText(/not a production benchmark/)).toBeVisible();
  });

  it("responds to the traffic slider", () => {
    render(<TrafficSimulation />);
    const slider = screen.getByRole("slider", { name: "Requests per second" });
    fireEvent.change(slider, { target: { value: "3600" } });
    expect(screen.getByRole("status", { name: "Simulation status" })).toHaveTextContent(/DEGRADED/);
    // Custom values deselect the presets.
    fireEvent.change(slider, { target: { value: "5000" } });
    for (const button of screen.getAllByRole("button", { name: /Traffic|Growth|Burst/ })) {
      expect(button).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("reflects infrastructure assumptions in the outcome", async () => {
    const user = userEvent.setup();
    render(<TrafficSimulation />);
    const status = () => screen.getByRole("status", { name: "Simulation status" });

    // Lower cache-hit rate raises database pressure at the same traffic.
    fireEvent.change(screen.getByRole("slider", { name: "Cache-hit rate" }), {
      target: { value: "85" },
    });
    expect(status()).toHaveTextContent(/DEGRADED/);
    fireEvent.change(screen.getByRole("slider", { name: "Cache-hit rate" }), {
      target: { value: "97.2" },
    });
    expect(status()).toHaveTextContent(/HEALTHY/);

    // A starved worker pool makes the queue the first constraint.
    fireEvent.change(screen.getByRole("slider", { name: "Worker pool size" }), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByRole("slider", { name: "Requests per second" }), {
      target: { value: "3600" },
    });
    expect(status()).toHaveTextContent(/FAILING/);
    expect(screen.getByText(/saturates at ≈/)).toHaveTextContent(/rabbitmq/);

    // A Stripe outage degrades the payment path.
    fireEvent.change(screen.getByRole("slider", { name: "Requests per second" }), {
      target: { value: "1200" },
    });
    fireEvent.change(screen.getByRole("slider", { name: "Worker pool size" }), {
      target: { value: "8" },
    });
    expect(status()).toHaveTextContent(/HEALTHY/);
    await user.click(screen.getByRole("checkbox", { name: /Stripe outage/ }));
    expect(status()).toHaveTextContent(/DEGRADED/);
    expect(screen.getByText(/Outage/)).toBeVisible();
  });

  it("labels every readout with its basis", () => {
    render(<TrafficSimulation />);
    expect(screen.getAllByText(METRIC_BASIS_LABEL.measured).length).toBeGreaterThan(0);
    expect(screen.getAllByText(METRIC_BASIS_LABEL.calculated).length).toBeGreaterThan(0);
    expect(screen.getAllByText(METRIC_BASIS_LABEL.estimated).length).toBeGreaterThan(0);
  });
});
