import { defineConfig, devices } from "@playwright/test";

const PORT = 3118;

/**
 * Authenticated e2e against a self-contained cloud-mode server: persistence is
 * "cloud", the database is an in-process PGlite, and sign-in uses the
 * fail-closed test-auth provider. No external database or OAuth is required.
 */
export default defineConfig({
  testDir: "./e2e-cloud",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  expect: { timeout: 15_000 },
  timeout: 120_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    env: {
      AXON_PERSISTENCE_MODE: "cloud",
      NEXT_PUBLIC_AXON_PERSISTENCE_MODE: "cloud",
      AXON_DB_DRIVER: "pglite",
      AUTH_SECRET: "test-auth-secret-not-for-production-000000",
      AXON_TEST_AUTH: "1",
      AXON_GENERATION_MODE: "offline",
    },
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
