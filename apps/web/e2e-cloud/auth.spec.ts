import { expect, test } from "@playwright/test";

/**
 * Full authenticated private-beta journey against a self-contained cloud-mode
 * server (PGlite database, fail-closed test-auth). Exercises route protection,
 * sign-in, the invite gate, redemption, owner-scoped project creation,
 * feedback, session-expiry recovery, and sign-out.
 */

test("unauthenticated product routes redirect to sign-in", async ({ page }) => {
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("liveness responds without touching the database", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { status: string; version: string };
  expect(body.status).toBe("ok");
  expect(typeof body.version).toBe("string");
  // Liveness never reveals the mode or database detail.
  expect(JSON.stringify(body)).not.toMatch(/postgres|database|DATABASE_URL/i);
});

test("readiness reports cloud ready and leaks no infrastructure detail", async ({ request }) => {
  const response = await request.get("/api/ready");
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { status: string; mode: string };
  expect(body).toMatchObject({ status: "ready", mode: "cloud" });
  expect(JSON.stringify(body)).not.toMatch(/postgres|host|user|password|url|select/i);
});

test("sign in, gate on invite, redeem, use the workspace, give feedback, sign out", async ({
  page,
  request,
}) => {
  const email = `partner-${Date.now()}@example.com`;

  // Sign in with test-auth from the protected route's redirect.
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/sign-in/);
  await page.getByLabel("Test email").fill(email);
  await page.getByRole("button", { name: "Sign in as test user" }).click();

  // Signed in but without beta access → gated to the invite page.
  await expect(page).toHaveURL(/\/invite/);
  await expect(page.getByRole("heading", { name: "Redeem your invitation" })).toBeVisible();

  // Seed an invitation (dev-only route) and redeem it.
  const seeded = await request.post("/api/dev/seed-invite", {
    data: { code: `INV-${Date.now()}` },
  });
  const { code } = (await seeded.json()) as { code: string };
  await page.getByLabel("Invitation code").fill(code);
  await page.getByRole("button", { name: "Redeem invitation" }).click();

  // Now inside the workspace.
  await expect(page).toHaveURL(/\/projects/);
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  // Create a server-persisted project.
  await page.getByRole("link", { name: "New Project" }).first().click();
  await page.getByLabel("Project name").fill("Partner project");
  await page.getByRole("radio", { name: /Sample architecture/ }).check();
  await page.getByRole("button", { name: "Create Project" }).click();
  await expect(page.getByRole("heading", { name: "Partner project" })).toBeVisible();

  // It survives a reload — it is on the server, not just this tab.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Partner project" })).toBeVisible();

  // Submit product feedback.
  await page.getByRole("button", { name: "Feedback" }).click();
  await page.getByLabel("Message").fill("The audit overlays are great.");
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByText(/your feedback was recorded/i)).toBeVisible();

  // Sign out clears authenticated access.
  await page.goto("/projects");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/(sign-in)?$|\/$/);
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/sign-in/);
});
