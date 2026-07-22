import { defineConfig, devices } from "@playwright/test";

const PORT = 3117;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  /**
   * Routes are compiled on first hit by the dev server, and the product
   * workspace pulls in React Flow twice plus the audit, simulation, and
   * recommendation packages. The default 5s expect timeout races that
   * compilation, so these are raised for the first-navigation case rather
   * than sprinkling per-assertion timeouts through the specs.
   */
  expect: { timeout: 15_000 },
  timeout: 90_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    env: { AXON_GENERATION_MODE: "offline" },
    url: `http://localhost:${PORT}/design-system`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
