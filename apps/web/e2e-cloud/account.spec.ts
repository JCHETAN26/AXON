import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/** Signs in a fresh beta user and returns their email. */
async function onboard(page: Page, request: APIRequestContext) {
  const email = `acct-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
  await page.goto("/projects");
  await page.getByLabel("Test email").fill(email);
  await page.getByRole("button", { name: "Sign in as test user" }).click();
  await expect(page).toHaveURL(/\/invite/);
  const seeded = await request.post("/api/dev/seed-invite", {
    data: { code: `INV-${Date.now()}` },
  });
  const { code } = (await seeded.json()) as { code: string };
  await page.getByLabel("Invitation code").fill(code);
  await page.getByRole("button", { name: "Redeem invitation" }).click();
  await expect(page).toHaveURL(/\/projects/);
  return email;
}

test("account settings shows identity and export, exposes no internal ids", async ({
  page,
  request,
}) => {
  const email = await onboard(page, request);
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Account", exact: true })).toBeVisible();
  const details = page.getByRole("region", { name: "Account details" });
  await expect(details.getByText(email)).toBeVisible();
  await expect(details.getByText("Active — invitation redeemed")).toBeVisible();
  // No internal database id or actual token/secret value surfaced (the word
  // "tokens" appears in the honest export disclaimer, so match values not prose).
  const body = (await page.locator("main").textContent()) ?? "";
  expect(body).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}/i);
  expect(body).not.toMatch(/access_token|refresh_token|gh[opsu]_[A-Za-z0-9]{20,}|AUTH_SECRET/);
});

test("project and account export return safe JSON with no secrets", async ({ page, request }) => {
  await onboard(page, request);
  // Create a project to export.
  await page.getByRole("link", { name: "New Project" }).first().click();
  await page.getByLabel("Project name").fill("Exportable");
  await page.getByRole("radio", { name: /Sample architecture/ }).check();
  await page.getByRole("button", { name: "Create Project" }).click();
  await expect(page.getByRole("heading", { name: "Exportable" })).toBeVisible();

  // Account export (shares the browser session cookies).
  const accountExport = await page.request.get("/api/account/export");
  expect(accountExport.ok()).toBe(true);
  expect(accountExport.headers()["content-disposition"]).toContain("attachment");
  expect(accountExport.headers()["cache-control"]).toContain("no-store");
  const account = (await accountExport.json()) as {
    kind: string;
    projects: { project: { name: string } }[];
  };
  expect(account.kind).toBe("axon-account-export");
  expect(account.projects.map((p) => p.project.name)).toContain("Exportable");
  const raw = JSON.stringify(account);
  expect(raw).not.toMatch(/access_token|refresh_token|AUTH_SECRET|composeText|session-token/i);
});

test("account deletion requires the confirmation phrase, signs out, and removes access", async ({
  page,
  request,
}) => {
  await onboard(page, request);
  await page.getByRole("link", { name: "New Project" }).first().click();
  await page.getByLabel("Project name").fill("Doomed");
  await page.getByRole("radio", { name: /^Blank/ }).check();
  await page.getByRole("button", { name: "Create Project" }).click();
  await expect(page.getByRole("heading", { name: "Doomed" })).toBeVisible();

  await page.goto("/account");
  await page.getByRole("button", { name: "Delete my account…" }).click();
  const dialog = page.getByRole("alertdialog");
  // The confirm button is disabled until the exact phrase is typed.
  const confirm = dialog.getByRole("button", { name: "Delete account" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(/Type .* to confirm/).fill("DELETE MY ACCOUNT");
  await expect(confirm).toBeEnabled();
  await confirm.click();

  // Redirected to the public confirmation, signed out.
  await expect(page).toHaveURL(/\/account\/deleted/);
  await expect(page.getByRole("heading", { name: "Your account was deleted" })).toBeVisible();

  // Product access is gone.
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/sign-in/);
});
