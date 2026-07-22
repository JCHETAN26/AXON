import { expect, test } from "@playwright/test";

const COMPOSE = `services:
  gateway:
    image: nginx:1.27
    ports:
      - "80:80"
    depends_on:
      - api
  api:
    build: ./api
    depends_on:
      - db
      - cache
  db:
    image: postgres:16
  cache:
    image: redis:7
`;

/**
 * Import lifecycle: paste a Compose document into a blank project, review the
 * detected services and warnings, correct a classification, preview the diff,
 * approve, and confirm the imported architecture is editable and auditable.
 */
test("imports a Compose document, reviews it, and approves an editable architecture", async ({
  page,
}) => {
  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill("Compose import");
  await page.getByRole("radio", { name: /^Blank/ }).check();
  await page.getByRole("button", { name: "Create Project" }).click();
  await expect(page.getByRole("heading", { name: "Compose import" })).toBeVisible();

  await page.getByRole("tab", { name: "Import" }).click();
  await expect(
    page.getByText("Imported from configuration—not verified against a running environment."),
  ).toBeVisible();

  // Paste and parse — nothing is executed, and nothing is persisted yet.
  await page.getByLabel("Docker Compose document").fill(COMPOSE);
  await page.getByRole("button", { name: "Parse Compose" }).click();
  await expect(page.getByRole("status", { name: "Import status" })).toHaveText(/DETECTED/);

  // Detected services and their classifications are shown.
  const table = page.getByRole("region", { name: "Detected services" });
  await expect(table.getByRole("cell", { name: "db", exact: false }).first()).toBeVisible();
  await expect(table.getByLabel("Category for db")).toBeVisible();
  await expect(table.getByLabel("Category for cache")).toBeVisible();

  // The build service produces an unresolved-feature warning.
  await expect(page.getByRole("region", { name: "Import warnings" })).toBeVisible();
  await expect(page.getByText(/build section/)).toBeVisible();

  // Correct the api classification before importing.
  await page.getByLabel("Category for api").selectOption("Compute");
  await expect(page.getByLabel("Category for api")).toHaveValue("Compute");

  // The diff preview is available.
  await page.getByRole("tab", { name: "diff" }).click();
  // 4 services plus 3 dependency edges added to an empty project.
  await expect(page.getByText(/7 added · 0 modified · 0 removed/)).toBeVisible();

  // Approve — only now does the project document change.
  await page.getByRole("button", { name: "Approve and Import" }).click();

  // The imported architecture lands on the editable canvas.
  await page.getByRole("tab", { name: "Canvas" }).click();
  const canvasPanel = page.locator("#workspace-panel-canvas");
  await expect(canvasPanel.locator(".react-flow__node")).toHaveCount(4);
  await expect(canvasPanel.locator(".react-flow__node", { hasText: "db" })).toBeVisible();

  // It survives a reload and can be audited like any other architecture.
  await page.reload();
  await page.getByRole("tab", { name: "Audit" }).click();
  await page.getByRole("button", { name: "Run Audit" }).click();
  await expect(page.getByRole("status", { name: "Audit status" })).toHaveText(/UP_TO_DATE/);
});
