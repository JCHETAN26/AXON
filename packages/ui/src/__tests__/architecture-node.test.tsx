import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ArchitectureNode } from "../architecture-node";

describe("ArchitectureNode", () => {
  it("renders category, name and metadata", () => {
    render(
      <ArchitectureNode category="Compute" name="api-gateway" meta="us-east-1 · 3 replicas" />,
    );
    expect(screen.getByRole("group", { name: "api-gateway — Compute" })).toBeInTheDocument();
    expect(screen.getByText("Compute")).toBeVisible();
    expect(screen.getByText("api-gateway")).toBeVisible();
    expect(screen.getByText("us-east-1 · 3 replicas")).toBeVisible();
  });

  it.each([
    ["selected", "Selected"],
    ["critical", "Critical"],
    ["recommended", "Recommended"],
    ["planned", "Planned"],
  ] as const)("communicates the %s state with visible text, not color alone", (state, label) => {
    render(<ArchitectureNode category="Data" name="orders-db" state={state} />);
    expect(screen.getByText(label)).toBeVisible();
  });

  it("exposes the locked indicator to assistive technology", () => {
    render(<ArchitectureNode category="Data" name="orders-db" locked />);
    expect(screen.getByText("Locked")).toBeInTheDocument();
  });

  it("labels the health indicator with text", () => {
    render(<ArchitectureNode category="Cache" name="redis" health="degraded" />);
    expect(screen.getByText("Health: Degraded")).toBeInTheDocument();
  });

  it("renders an optional icon slot without replacing the text label", () => {
    render(
      <ArchitectureNode
        category="Compute"
        name="api"
        icon={<span aria-label="Compute icon">C</span>}
      />,
    );
    expect(screen.getByLabelText("Compute icon")).toBeVisible();
    expect(screen.getByText("Compute")).toBeVisible();
  });
});
