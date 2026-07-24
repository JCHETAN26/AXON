import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Next.js requires tsconfig `jsx: "preserve"`; this plugin compiles the JSX
  // for the test pipeline instead.
  plugins: [react()],
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Server integration tests spin up an in-process PGlite database and run
    // migrations once per file; give those setup hooks room under parallel load.
    hookTimeout: 30_000,
    // Integration tests (PGlite queries, fake timers, full React workspace
    // renders) can take well over the 5s default when the whole suite runs in
    // parallel and contends for CPU — observed up to ~16s. Without this, they
    // fail spuriously in the full run yet pass in isolation. Kept below
    // hookTimeout so a genuinely hung test still surfaces.
    testTimeout: 20_000,
    include: [
      "components/**/*.test.{ts,tsx}",
      "data/**/*.test.ts",
      "lib/**/*.test.{ts,tsx}",
      "app/**/*.test.{ts,tsx}",
    ],
  },
});
