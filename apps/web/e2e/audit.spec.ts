import { expect, test } from "@playwright/test";

/**
 * Full audit lifecycle against the sample project: run, acknowledge, edit the
 * architecture on the canvas, rerun, and verify reconciliation carried the
 * acknowledgement and auto-resolved the fixed finding.
 */
test("audits a sample project, reconciles across an edit, and keeps acknowledgements", async ({
  page,
}) => {
  // Create a sample project.
  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill("Audit lifecycle");
  await page.getByRole("radio", { name: /Sample architecture/ }).check();
  await page.getByRole("button", { name: "Create Project" }).click();
  await expect(page.getByRole("heading", { name: "Audit lifecycle" })).toBeVisible();

  // Opening a sample project persists AXON's computed layout positions once
  // the canvas mounts. Let that settle before auditing, otherwise the layout
  // save races the run and the audit reads as immediately stale.
  const canvasPanel = page.locator("#workspace-panel-canvas");
  await expect(canvasPanel.locator(".react-flow__node")).toHaveCount(12);
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(/SAVED/);
  await page.waitForTimeout(1200);

  // Run the first audit.
  await page.getByRole("tab", { name: "Audit" }).click();
  await expect(page.getByRole("status", { name: "Audit status" })).toHaveText(/NEVER_RUN/);
  await page.getByRole("button", { name: "Run Audit" }).click();
  await expect(page.getByRole("status", { name: "Audit status" })).toHaveText(/UP_TO_DATE/);
  await expect(page.getByText("Findings (5)")).toBeVisible();

  // The audit survives a reload — it is persisted, not ephemeral UI state.
  await page.reload();
  await page.getByRole("tab", { name: "Audit" }).click();
  await expect(page.getByText("Findings (5)")).toBeVisible();

  // Inspect and acknowledge the gateway single point of failure.
  await page
    .getByRole("button", { name: /Potential single point of failure: "api-gateway"/ })
    .click();
  await expect(page.getByText("What AXON detected")).toBeVisible();
  await expect(
    page.getByText("Deterministic analysis · based on the current architecture document"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Acknowledge", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reopen" })).toBeVisible();

  // Open findings overlay on the canvas: rabbitmq carries the SPOF, the
  // dead-letter gap, and the document-wide telemetry gap.
  await page.getByRole("tab", { name: "Canvas" }).click();
  const rabbitNode = canvasPanel.locator(".react-flow__node", { hasText: "rabbitmq" });
  await expect(rabbitNode.getByText(/high · 3/i)).toBeVisible();

  // Delete rabbitmq on the canvas. Wait for the edit to be marked unsaved
  // before waiting for SAVED — the status still reads SAVED during the
  // autosave debounce, so checking it directly would race the persist.
  await rabbitNode.click();
  await page.getByRole("button", { name: "Delete Selected" }).click();
  await expect(canvasPanel.locator(".react-flow__node", { hasText: "rabbitmq" })).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(
    /UNSAVED_CHANGES|SAVING/,
  );
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(/SAVED/, {
    timeout: 10_000,
  });

  // The audit is now stale; rerun reconciles.
  await page.getByRole("tab", { name: "Audit" }).click();
  await expect(page.getByRole("status", { name: "Audit status" })).toHaveText(
    /ARCHITECTURE_CHANGED/,
  );
  await page.getByRole("button", { name: "Rerun Audit" }).click();
  await expect(page.getByRole("status", { name: "Audit status" })).toHaveText(/UP_TO_DATE/);

  // The rabbitmq findings auto-resolved (the node is gone) while the
  // acknowledged gateway finding kept its acknowledgement.
  await expect(page.getByText("Findings (3)")).toBeVisible();
  await expect(page.getByText("Resolved (2)")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /No dead-letter path is represented for "rabbitmq"/ }),
  ).toContainText("Resolved");

  await page
    .getByRole("button", { name: /Potential single point of failure: "api-gateway"/ })
    .click();
  await expect(page.getByRole("button", { name: "Reopen" })).toBeVisible();
});
