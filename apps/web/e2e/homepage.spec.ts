import { expect, test } from "@playwright/test";

test("homepage renders the hero, runs the audit and switches themes", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Design systems that are ready for reality.",
  );

  // Theme toggle in the header persists the choice on <html>.
  const html = page.locator("html");
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.getByRole("radio", { name: "Light" }).click();
  await expect(html).toHaveAttribute("data-theme", "light");

  // Run Audit progressively reveals findings sourced from the demo dataset.
  await page.getByRole("button", { name: "Run Audit" }).click();
  await expect(page.getByText("SPOF · Critical").first()).toBeVisible();
  await expect(page.getByText(/AUDIT_COMPLETE/)).toBeVisible();
});

test("prompt-to-production and audit sections are interactive", async ({ page }) => {
  await page.goto("/");

  // Generation demo starts complete and can be replayed to completion.
  await expect(page.getByRole("heading", { name: "Prompt to Production." })).toBeVisible();
  await expect(page.getByText(/ARCHITECTURE_COMPLETE/)).toBeVisible();
  await page.getByRole("button", { name: "Replay Generation" }).click();
  await expect(page.getByText(/GENERATING/)).toBeVisible();
  await expect(page.getByText(/ARCHITECTURE_COMPLETE/)).toBeVisible({ timeout: 15_000 });

  // Selecting an audit finding updates the evidence panel.
  await expect(
    page.getByRole("heading", { name: "A beautiful diagram is not enough." }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Message broker has no dead-letter queue/ }).click();
  const evidencePanel = page.locator("#audit-evidence-panel");
  await expect(evidencePanel).toContainText(
    "Add a dead-letter exchange, retry policy, and failure observability.",
  );
  await expect(evidencePanel).toContainText("AI inference");
});

test("mcp workflow requires approval and the simulation finds the constraint", async ({ page }) => {
  await page.goto("/");

  // MCP scan runs to the approval gate; sync only completes after approval.
  await page.getByRole("button", { name: "Run Local Scan" }).click();
  const approve = page.getByRole("button", { name: "Approve Sync" });
  await expect(approve).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/AWAITING_APPROVAL/)).toBeVisible();
  await approve.click();
  await expect(page.getByText(/studio received 12 services/)).toBeVisible({ timeout: 15_000 });

  // The Black Friday scenario saturates PostgreSQL.
  await page.getByRole("button", { name: /Black Friday Burst/ }).click();
  await expect(page.getByText(/FAILING/)).toBeVisible();
  await expect(page.getByText(/saturates at ≈/)).toBeVisible();
  await expect(page.getByText(/not a production benchmark/)).toBeVisible();
});

test("architecture evolution and live monitoring are interactive", async ({ page }) => {
  await page.goto("/");

  // Diff views derive from the patch model.
  await page.getByRole("tab", { name: "Recommended" }).click();
  await expect(page.getByText("pgbouncer").first()).toBeVisible();
  await page.getByRole("tab", { name: "Diff" }).click();
  await expect(page.getByText("Connection changes")).toBeVisible();
  await expect(page.getByText("api-gateway → auth-service (sync)").first()).toBeVisible();

  // Monitoring defaults to the active incident; scrubbing back clears it.
  await expect(
    page.getByRole("heading", { name: "Connection leak in authentication service" }),
  ).toBeVisible();
  await page.getByRole("slider", { name: "Timeline" }).fill("0");
  await expect(page.getByText(/No active incidents — all monitored services/)).toBeVisible();
});

test("pricing, final cta and footer close out the page", async ({ page }) => {
  await page.goto("/");

  // Header nav "Pricing" resolves to the real section.
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Pricing" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Start free. Upgrade when the architecture becomes part of your workflow.",
    }),
  ).toBeInViewport();

  await expect(page.getByText("Planned beta pricing")).toBeVisible();
  await expect(page.getByText("Recommended for beta")).toBeVisible();
  await expect(page.getByRole("link", { name: "Choose Builder" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Choose Pro" })).toBeVisible();
  await expect(page.getByText(/Pricing is provisional during beta/)).toBeVisible();

  await expect(page.getByRole("heading", { name: "Ready to evolve your system?" })).toBeVisible();
  const footer = page.getByRole("contentinfo");
  await expect(footer).toBeVisible();
  await expect(footer.getByRole("link", { name: "Monitoring" })).toBeVisible();
  await expect(footer.getByText(/© 2026 AXON/)).toBeVisible();
});
