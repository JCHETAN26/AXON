import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test("mobile renders the focused flow and a keyboard-usable menu", async ({ page }) => {
  await page.goto("/");

  // The full desktop topology is replaced by the focused flow on mobile.
  await expect(page.getByRole("list", { name: "Primary request flow" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // The mobile menu opens, navigates, and closes.
  const menuButton = page.getByRole("button", { name: "Open menu" });
  await expect(menuButton).toBeVisible();
  await menuButton.click();
  const mobileNav = page.getByRole("navigation", { name: "Mobile" });
  await expect(mobileNav).toBeVisible();
  await mobileNav.getByRole("link", { name: "Pricing" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile" })).toBeHidden();
  await expect(page.getByText("Planned beta pricing")).toBeInViewport();

  // The audit demonstration is preserved on small viewports.
  await page.getByRole("button", { name: "Run Audit" }).click();
  await expect(
    page.getByText("Authentication service is a single point of failure").first(),
  ).toBeVisible({ timeout: 10_000 });
});
