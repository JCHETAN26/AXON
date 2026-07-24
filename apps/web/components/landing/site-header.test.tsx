import { ThemeProvider } from "@axon/ui";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SiteHeader } from "./site-header";

function renderHeader() {
  return render(
    <ThemeProvider>
      <SiteHeader />
    </ThemeProvider>,
  );
}

describe("SiteHeader", () => {
  it("renders the wordmark, primary navigation and CTA", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: "AXON" })).toHaveAttribute("href", "/");
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Product" })).toHaveAttribute("href", "#product");
    expect(screen.getByRole("link", { name: "MCP" })).toHaveAttribute("href", "#mcp");
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "#pricing");
    // Sign In must route to the sign-in page, not a dead in-page anchor.
    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/sign-in");
    expect(screen.getByRole("link", { name: "Start Building Free" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Color theme" })).toBeInTheDocument();
  });

  it("opens and closes the mobile menu from its toggle button", async () => {
    const user = userEvent.setup();
    renderHeader();
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const mobileNav = screen.getByRole("navigation", { name: "Mobile" });
    expect(mobileNav).toBeInTheDocument();
    expect(within(mobileNav).getByRole("link", { name: "Sign In" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
  });

  it("closes the mobile menu with Escape and restores focus to the toggle", async () => {
    const user = userEvent.setup();
    renderHeader();
    const toggle = screen.getByRole("button", { name: "Open menu" });
    await user.click(toggle);
    expect(screen.getByRole("navigation", { name: "Mobile" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
  });

  it("closes the mobile menu after choosing a navigation link", async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const mobileNav = screen.getByRole("navigation", { name: "Mobile" });
    await user.click(within(mobileNav).getByRole("link", { name: "Product" }));
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
  });
});
