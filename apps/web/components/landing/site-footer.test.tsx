import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FinalCta } from "./final-cta";
import { SiteFooter } from "./site-footer";

describe("FinalCta", () => {
  it("renders the closing actions", () => {
    render(<FinalCta />);
    expect(screen.getByRole("heading", { name: "Ready to evolve your system?" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Start Building Free" })).toHaveAttribute(
      "href",
      "/projects/new",
    );
    expect(screen.getByRole("link", { name: /Run Locally with MCP/ })).toHaveAttribute(
      "href",
      "#mcp",
    );
  });
});

describe("SiteFooter", () => {
  it("renders a contentinfo landmark with footer navigation", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Footer" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "#pricing");
    expect(screen.getByRole("link", { name: "Monitoring" })).toHaveAttribute("href", "#monitoring");
    expect(screen.getByText(/© 2026 AXON/)).toBeVisible();
    expect(screen.getByText(/pricing provisional/)).toBeVisible();
  });
});
