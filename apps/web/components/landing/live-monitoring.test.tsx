import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LiveMonitoring } from "./live-monitoring";
import { MONITORING_TIMELINE } from "@/data/monitoring";

describe("LiveMonitoring", () => {
  it("defaults to now with the active incident and its root cause", () => {
    render(<LiveMonitoring />);
    expect(screen.getByRole("status", { name: "Monitoring status" })).toHaveTextContent(
      /1 active incident · auth-service/,
    );
    expect(
      screen.getByRole("heading", { name: "Connection leak in authentication service" }),
    ).toBeVisible();
    expect(screen.getByText("87% confidence")).toBeVisible();
    expect(screen.getByText(/Active incident/, { selector: "p" })).toBeVisible();
    expect(screen.getByText("Active incident", { selector: "span" })).toBeVisible();
  });

  it("classifies incident evidence and links to the recommended change", () => {
    render(<LiveMonitoring />);
    expect(screen.getAllByText("Runtime telemetry").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AI inference").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "See the recommended architecture change" }),
    ).toHaveAttribute("href", "#architecture-evolution");
  });

  it("scrubs back to a healthy snapshot with no incident", () => {
    render(<LiveMonitoring />);
    fireEvent.change(screen.getByRole("slider", { name: "Timeline" }), {
      target: { value: "0" },
    });
    expect(screen.getByRole("status", { name: "Monitoring status" })).toHaveTextContent(
      /no active incidents/,
    );
    expect(screen.getByText(/No active incidents — all monitored services/)).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Connection leak in authentication service" }),
    ).not.toBeInTheDocument();
    // Auth metrics reflect the earliest sample.
    const firstStep = MONITORING_TIMELINE[0];
    const authErr = firstStep?.samples.find((sample) => sample.nodeId === "auth")?.metrics[0];
    if (authErr !== undefined) {
      expect(screen.getByText(authErr.value)).toBeInTheDocument();
    }
  });

  it("labels the telemetry source and preview honestly", () => {
    render(<LiveMonitoring />);
    expect(screen.getByText(/source: datadog · simulated preview/)).toBeVisible();
    expect(screen.getByText("Simulated telemetry preview")).toBeVisible();
  });

  it("announces the current snapshot politely", () => {
    render(<LiveMonitoring />);
    expect(screen.getByRole("status", { name: "Monitoring status" })).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });
});
