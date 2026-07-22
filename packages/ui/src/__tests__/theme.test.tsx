import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "../theme/theme-provider";
import { THEME_STORAGE_KEY, themeInitScript } from "../theme/theme-script";
import { ThemeToggle } from "../theme-toggle";

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe("theme system", () => {
  it("renders a labelled radio group with three options", () => {
    renderToggle();
    expect(screen.getByRole("radiogroup", { name: "Color theme" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Dark" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "System" })).toBeInTheDocument();
  });

  it("applies and persists an explicit theme choice", async () => {
    const user = userEvent.setup();
    renderToggle();
    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(screen.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
  });

  it("restores the stored preference on mount", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    renderToggle();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
  });

  it("falls back to system when the stored value is invalid", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "hotdog");
    renderToggle();
    // matchMedia is stubbed to light in the test environment.
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(screen.getByRole("radio", { name: "System" })).toHaveAttribute("aria-checked", "true");
  });

  it("moves the selection with arrow keys", async () => {
    const user = userEvent.setup();
    renderToggle();
    const light = screen.getByRole("radio", { name: "Light" });
    await user.click(light);
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("ships an init script that resolves the stored theme before paint", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    // Execute the inline <head> script exactly as the browser would.
    eval(themeInitScript);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
