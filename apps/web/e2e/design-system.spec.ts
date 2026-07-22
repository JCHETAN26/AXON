import { expect, test } from "@playwright/test";

test("design-system page renders and theme selection persists", async ({ page }) => {
  await page.goto("/design-system");

  await expect(page.getByRole("heading", { level: 1, name: "Design System" })).toBeVisible();

  // The init script resolves a theme before hydration.
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", /^(light|dark)$/);

  // Explicitly choose dark via the page-level toggle.
  await page
    .getByRole("radiogroup", { name: "Color theme" })
    .first()
    .getByRole("radio", { name: "Dark" })
    .click();
  await expect(html).toHaveAttribute("data-theme", "dark");

  // The choice survives a reload without flashing the wrong theme.
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
});
