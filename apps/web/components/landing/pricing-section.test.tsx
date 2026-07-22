import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PricingSection } from "./pricing-section";
import { PRICING_TIERS } from "@/data/pricing";

describe("PricingSection", () => {
  it("renders the approved heading and provisional labels", () => {
    render(<PricingSection />);
    expect(
      screen.getByRole("heading", {
        name: "Start free. Upgrade when the architecture becomes part of your workflow.",
      }),
    ).toBeVisible();
    expect(screen.getByText("Planned beta pricing")).toBeVisible();
    expect(screen.getByText(/Pricing is provisional during beta/)).toBeVisible();
  });

  it("renders every tier with its price and CTA", () => {
    render(<PricingSection />);
    for (const tier of PRICING_TIERS) {
      expect(screen.getByRole("heading", { name: tier.name, level: 3 })).toBeVisible();
      expect(screen.getByRole("link", { name: tier.ctaLabel })).toBeInTheDocument();
    }
    expect(screen.getByText("$0")).toBeVisible();
    expect(screen.getByText("$15")).toBeVisible();
    expect(screen.getByText("$24")).toBeVisible();
  });

  it("shows availability chips for non-available features", () => {
    render(<PricingSection />);
    expect(screen.getAllByText("Planned").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Beta").length).toBeGreaterThan(0);
    expect(screen.getByText("Product preview")).toBeVisible();
    expect(screen.getByText("Recommended for beta")).toBeVisible();
    expect(screen.queryByText(/most popular/i)).not.toBeInTheDocument();
  });
});
