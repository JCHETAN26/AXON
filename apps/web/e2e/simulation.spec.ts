import { expect, test } from "@playwright/test";

/**
 * Simulation lifecycle on the sample project: run, read the projected
 * constraint, inspect a component's evidence, switch scenarios, and confirm
 * the read-only overlay appears on the architecture canvas.
 */
test("simulates a sample project, compares scenarios, and overlays the canvas", async ({
  page,
}) => {
  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill("Simulation lifecycle");
  await page.getByRole("radio", { name: /Sample architecture/ }).check();
  await page.getByRole("button", { name: "Create Project" }).click();
  await expect(page.getByRole("heading", { name: "Simulation lifecycle" })).toBeVisible();

  await page.getByRole("tab", { name: "Simulate" }).click();

  // The disclaimer is present before anything is computed.
  await expect(
    page.getByText("Estimated from supplied architecture parameters—not a production benchmark."),
  ).toBeVisible();
  await expect(page.getByRole("status", { name: "Simulation status" })).toHaveText(/NOT_RUN/);

  await page.getByRole("button", { name: "Run Simulation" }).click();
  await expect(page.getByRole("status", { name: "Simulation status" })).toHaveText(/UP_TO_DATE/);
  await expect(page.getByText("First projected constraint")).toBeVisible();
  await expect(page.getByText("Components (12)")).toBeVisible();

  // Inputs are persisted, so the simulation survives a reload.
  await page.reload();
  await page.getByRole("tab", { name: "Simulate" }).click();
  await expect(page.getByText("Components (12)")).toBeVisible();

  // The inspector separates assumptions from derived and projected values.
  await page.getByRole("button", { name: /postgresql/ }).click();
  await expect(page.getByText("Modeled load")).toBeVisible();
  await expect(page.getByText("AXON default assumption").first()).toBeVisible();
  // The sample documents "conn 82/300", so that limit is attributed to the
  // architecture rather than presented back as an AXON default.
  await expect(page.getByText("Architecture-provided assumption").first()).toBeVisible();
  await expect(page.getByText("Projected result").first()).toBeVisible();
  await expect(page.getByText("What this model does not represent")).toBeVisible();
  // Confidence is graded from provenance and explained.
  await expect(page.getByRole("heading", { name: "Confidence" })).toBeVisible();

  // Editing a capacity assumption reruns and marks the profile advanced.
  const limit = page.getByLabel("Connection limit");
  await limit.fill("1000");
  await page.getByRole("button", { name: "Save assumptions" }).click();
  await expect(page.getByRole("status", { name: "Simulation status" })).toHaveText(/UP_TO_DATE/);
  // The edited value now reads as the user's own input.
  await page.getByRole("button", { name: /postgresql/ }).click();
  await expect(page.getByText("User-provided input").first()).toBeVisible();

  // It survives a reload — the profile is persisted locally.
  await page.reload();
  await page.getByRole("tab", { name: "Simulate" }).click();
  await page.getByRole("button", { name: /postgresql/ }).click();
  await expect(page.getByLabel("Connection limit")).toHaveValue("1000");

  // A heavier scenario raises utilization and reports the baseline delta.
  await page.getByRole("button", { name: /Peak burst/ }).click();
  await expect(page.getByRole("button", { name: /Peak burst/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: /postgresql/ }).click();
  await expect(page.getByText("Versus baseline")).toBeVisible();
  await expect(page.getByText(/percentage points versus the baseline scenario/)).toBeVisible();

  // Read-only utilization overlay renders on the canvas without dirtying it.
  await page.getByRole("tab", { name: "Canvas" }).click();
  const postgresNode = page.locator(".react-flow__node", { hasText: "postgresql" });
  await expect(postgresNode.getByText(/estimated utilization/)).toBeVisible();
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(/SAVED/);
});
