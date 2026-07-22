import { expect, test } from "@playwright/test";

/**
 * Recommendation lifecycle on the sample project: derive from audit findings,
 * preview without persisting, approve explicitly, apply, and confirm the
 * audit goes stale while the source finding stays open until a rerun.
 */
test("derives recommendations from findings, applies one with approval, and keeps the finding open until rerun", async ({
  page,
}) => {
  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill("Recommendation lifecycle");
  await page.getByRole("radio", { name: /Sample architecture/ }).check();
  await page.getByRole("button", { name: "Create Project" }).click();
  await expect(page.getByRole("heading", { name: "Recommendation lifecycle" })).toBeVisible();

  // Opening a sample project persists AXON's computed layout positions (the
  // sample factory stores none), which is a real document change. Let that
  // settle before auditing so the audit is not immediately stale.
  const canvasPanel = page.locator("#workspace-panel-canvas");
  await expect(canvasPanel.locator(".react-flow__node")).toHaveCount(12);
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(/SAVED/);
  await page.waitForTimeout(1200);

  // Recommendations require an audit first.
  await page.getByRole("tab", { name: "Recommend" }).click();
  await expect(page.getByText("No audit findings yet.")).toBeVisible();

  await page.getByRole("tab", { name: "Audit" }).click();
  await page.getByRole("button", { name: "Run Audit" }).click();
  await expect(page.getByRole("status", { name: "Audit status" })).toHaveText(/UP_TO_DATE/);

  // Now recommendations exist, derived from the persisted findings.
  await page.getByRole("tab", { name: "Recommend" }).click();
  await expect(page.getByText("Recommendations (5)")).toBeVisible();

  // Manual-review changes never offer an apply action.
  await page.getByRole("button", { name: /Review redundancy for "api-gateway"/ }).click();
  const inspector = page.getByRole("complementary", { name: "Change inspector" });
  await expect(inspector.getByRole("button", { name: "Review and Apply" })).toHaveCount(0);
  await expect(inspector.getByText(/does not apply this change automatically/)).toBeVisible();

  // The automatic dead-letter change can be previewed.
  await page.getByRole("button", { name: /Represent a dead-letter path for "rabbitmq"/ }).click();
  await expect(inspector.getByText("Triggered by")).toBeVisible();
  await page.getByRole("tab", { name: "Diff" }).click();
  const comparison = page.getByRole("region", { name: "Architecture comparison" });
  await expect(comparison.getByText(/2 added · 0 modified · 0 removed/)).toBeVisible();

  // Previewing does not persist: the canvas still has the original 12 nodes.
  // Scoped to the canvas panel — the read-only comparison canvas stays mounted.
  await page.getByRole("tab", { name: "Canvas" }).click();
  await expect(canvasPanel.locator(".react-flow__node")).toHaveCount(12);
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(/SAVED/);

  // Applying requires explicit approval.
  await page.getByRole("tab", { name: "Recommend" }).click();
  await inspector.getByRole("button", { name: "Review and Apply" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Apply architecture-document change?")).toBeVisible();
  await expect(dialog.getByText(/does not change infrastructure, source code/)).toBeVisible();

  // Cancelling changes nothing.
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await inspector.getByRole("button", { name: "Review and Apply" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Apply Change" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // The document now carries the new component.
  await page.getByRole("tab", { name: "Canvas" }).click();
  await expect(canvasPanel.locator(".react-flow__node")).toHaveCount(13);
  await expect(
    canvasPanel.locator(".react-flow__node", { hasText: "rabbitmq-dead-letter" }),
  ).toBeVisible();

  // The applied change is remembered across a reload, and the recommendation
  // is marked Applied rather than offering to run again.
  await page.getByRole("tab", { name: "Recommend" }).click();
  await page.reload();
  await page.getByRole("tab", { name: "Recommend" }).click();
  await expect(page.getByText("Applied")).toBeVisible();
  await expect(page.getByRole("status", { name: "Recommendation status" })).toHaveText(
    /AUDIT_STALE/,
  );

  // The audit is stale and the source finding is still open — only a rerun
  // resolves it.
  await page.getByRole("tab", { name: "Audit" }).click();
  await expect(page.getByRole("status", { name: "Audit status" })).toHaveText(
    /ARCHITECTURE_CHANGED/,
  );
  await expect(
    page.getByRole("button", { name: /No dead-letter path is represented for "rabbitmq"/ }),
  ).toContainText("Open");

  await page.getByRole("button", { name: "Rerun Audit" }).click();
  await expect(page.getByRole("status", { name: "Audit status" })).toHaveText(/UP_TO_DATE/);
  await expect(page.getByText("Resolved (1)")).toBeVisible();

  // With the finding resolved there is nothing left to propose for it.
  await page.getByRole("tab", { name: "Recommend" }).click();
  await expect(
    page.getByRole("button", { name: /Represent a dead-letter path for "rabbitmq"/ }),
  ).toHaveCount(0);
});
