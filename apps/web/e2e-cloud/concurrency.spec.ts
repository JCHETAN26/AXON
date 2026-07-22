import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/** Signs in a fresh beta user through the real invite gate. */
async function onboard(page: Page, request: APIRequestContext): Promise<void> {
  const email = `conc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
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
}

test("a stale second tab is rejected with a revision conflict, not a silent overwrite", async ({
  page,
  request,
}) => {
  await onboard(page, request);

  // Create a sample project in tab A.
  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill("Concurrent");
  await page.getByRole("radio", { name: /Sample architecture/ }).check();
  await page.getByRole("button", { name: "Create Project" }).click();
  await expect(page.getByRole("heading", { name: "Concurrent" })).toBeVisible();
  const projectUrl = page.url();

  const statusA = page.getByRole("status", { name: "Save status" });
  await expect(page.locator(".react-flow")).toBeVisible();
  await expect(statusA).toHaveText(/SAVED/);

  // Tab B: the same project, same session, its own client repository instance.
  // Open it first and let it fully quiesce, so its cached revision is what we
  // will later make stale. (Each fresh load persists React Flow's one-time
  // layout settle, so whichever tab loads last holds the newest revision.)
  const tabB = await page.context().newPage();
  await tabB.goto(projectUrl);
  const statusB = tabB.getByRole("status", { name: "Save status" });
  await expect(tabB.locator(".react-flow")).toBeVisible();
  await expect(statusB).toHaveText(/SAVED/);

  // Now reload tab A. It reads the newest revision and becomes current, which
  // leaves tab B holding a stale revision.
  await page.reload();
  await expect(page.locator(".react-flow")).toBeVisible();
  await expect(statusA).toHaveText(/SAVED/);

  // Tab A edits and saves successfully, advancing the revision past tab B's.
  await page.getByRole("button", { name: "Add Node" }).click();
  await expect(page.locator(".react-flow__node", { hasText: "new-service" })).toBeVisible();
  await expect(statusA).toHaveText(/SAVED ·/);

  // Tab B edits its now-stale copy. The save must be rejected as a conflict.
  await tabB.getByRole("button", { name: "Add Node" }).click();
  await expect(tabB.locator(".react-flow__node", { hasText: "new-service" })).toBeVisible();
  await expect(statusB).toHaveText(/REVISION_CONFLICT/);

  // Tab B never claims Saved, and keeps its in-memory edit.
  await expect(statusB).not.toHaveText(/SAVED ·/);
  await expect(tabB.locator(".react-flow__node", { hasText: "new-service" })).toBeVisible();

  await tabB.close();
});
