import { ThemeProvider } from "@axon/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TelemetryCalibrationWorkspace, type TelemetrySourceItem } from "./telemetry-workspace";
import { type CalibrationResult } from "@axon/architecture-simulation";

const SOURCES: TelemetrySourceItem[] = [
  {
    id: "src-1",
    provider: "prometheus",
    name: "Prod Prometheus",
    endpointUrl: "https://prometheus.internal",
    status: "connected",
  },
];

const CALIBRATION: CalibrationResult = {
  calibratedProfile: {
    components: {
      "web-server": {
        requestsPerSecondPerUnit: 1200,
        units: 12,
      },
    },
  },
  calibratedComponentCount: 1,
  calibrationConfidence: "confirmed",
};

function renderWorkspace(overrides: Partial<Parameters<typeof TelemetryCalibrationWorkspace>[0]> = {}) {
  const props = {
    projectId: "proj-1",
    sources: SOURCES,
    calibrationResult: CALIBRATION,
    onRegisterSource: vi.fn().mockResolvedValue(undefined),
    onApplyCalibration: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(
    <ThemeProvider>
      <TelemetryCalibrationWorkspace {...props} />
    </ThemeProvider>
  );
  return props;
}

describe("TelemetryCalibrationWorkspace", () => {
  it("renders telemetry calibration header and measured components", () => {
    renderWorkspace();

    expect(screen.getByText("Runtime Telemetry & Calibrated Simulation Engine")).toBeVisible();
    expect(screen.getByText("web-server")).toBeVisible();
    expect(screen.getByText("telemetry-measured")).toBeVisible();
    expect(screen.getByRole("button", { name: /APPLY TELEMETRY TO SIMULATION/ })).toBeEnabled();
  });

  it("triggers apply calibration action when clicked", async () => {
    const user = userEvent.setup();
    const props = renderWorkspace();

    await user.click(screen.getByRole("button", { name: /APPLY TELEMETRY TO SIMULATION/ }));
    expect(props.onApplyCalibration).toHaveBeenCalled();
  });
});
