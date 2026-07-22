import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HeroSection } from "./hero-section";

describe("HeroSection", () => {
  it("renders the approved headline with the accented word", () => {
    render(<HeroSection />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Design systems that are ready for reality.");
    const accent = screen.getByText("ready");
    expect(accent.className).toContain("text-accent");
  });

  it("renders the supporting copy and product statement", () => {
    render(<HeroSection />);
    expect(
      screen.getByText(/The visual infrastructure map that keeps your engineering team in sync/),
    ).toBeVisible();
    expect(screen.getByText("Generate. Audit. Simulate. Monitor.")).toBeVisible();
  });

  it("renders the three hero actions as links", () => {
    render(<HeroSection />);
    expect(screen.getByRole("link", { name: "Build Your First Architecture" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Interactive Demo" })).toHaveAttribute(
      "href",
      "#demo",
    );
    expect(screen.getByRole("link", { name: /Run Locally with MCP/ })).toHaveAttribute(
      "href",
      "#mcp",
    );
  });
});
