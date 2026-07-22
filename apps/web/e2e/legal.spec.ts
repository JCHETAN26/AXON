import { expect, test } from "@playwright/test";

/** The trust/legal pages are public and must render without authentication. */
const PAGES: [string, string][] = [
  ["/privacy", "Privacy"],
  ["/terms", "Terms of use"],
  ["/security", "Security & trust"],
  ["/data-handling", "Data handling"],
];

for (const [path, heading] of PAGES) {
  test(`${path} is public and renders`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    // No horizontal overflow at mobile width.
    await page.setViewportSize({ width: 390, height: 800 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
}

test("legal pages are reachable from the marketing footer", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("navigation", { name: "Legal" });
  await expect(footer.getByRole("link", { name: "Privacy" })).toBeVisible();
  await footer.getByRole("link", { name: "Data Handling" }).click();
  await expect(page).toHaveURL(/\/data-handling/);
});
