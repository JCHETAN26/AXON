import { expect, test } from "@playwright/test";

test("canvas editing autosaves and survives reload", async ({ page }) => {
  // Create a sample project to edit.
  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill("Canvas project");
  await page.getByRole("radio", { name: /Sample architecture/ }).check();
  await page.getByRole("button", { name: "Create Project" }).click();
  await expect(page.getByRole("heading", { name: "Canvas project" })).toBeVisible();

  const status = page.getByRole("status", { name: "Save status" });
  await expect(page.locator(".react-flow")).toBeVisible();
  await expect(status).toHaveText(/SAVED/);

  // Rename a node through the inspector.
  await page.locator(".react-flow__node", { hasText: "postgresql" }).click();
  const nameField = page.getByLabel("Service name");
  await expect(nameField).toHaveValue("postgresql");
  await nameField.fill("postgres-primary");
  await expect(status).toHaveText(/UNSAVED_CHANGES|SAVING/);
  await expect(status).toHaveText(/SAVED ·/);

  // The rename persists across a reload.
  await page.reload();
  await expect(page.locator(".react-flow__node", { hasText: "postgres-primary" })).toBeVisible();

  // Add a node, then delete it.
  await page.getByRole("button", { name: "Add Node" }).click();
  await expect(page.locator(".react-flow__node", { hasText: "new-service" })).toBeVisible();
  await expect(page.getByLabel("Service name")).toHaveValue("new-service");
  await page.getByRole("button", { name: "Delete Selected" }).click();
  await expect(page.locator(".react-flow__node", { hasText: "new-service" })).toHaveCount(0);
  await expect(status).toHaveText(/SAVED ·/);

  // Change a connection kind through the edge inspector.
  await page.locator(".react-flow__edge").first().click({ force: true });
  await expect(page.getByLabel("Connection kind")).toBeVisible();
  await page.getByLabel("Connection kind").selectOption("telemetry");
  await expect(status).toHaveText(/SAVED ·/);

  // Everything persists.
  await page.reload();
  await expect(page.locator(".react-flow__node", { hasText: "postgres-primary" })).toBeVisible();
  await expect(page.locator(".react-flow__node", { hasText: "new-service" })).toHaveCount(0);
});
