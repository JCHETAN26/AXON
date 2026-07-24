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
    // Cap worker parallelism. Each server integration test file spins up its own
    // in-process PGlite database and runs every migration in beforeAll. With
    // unbounded workers a dozen migrations run at once, thrash the CPU, and blow
    // past the hook/test timeouts under load — even though each file passes in a
    // few seconds when it has CPU to itself. Half the cores keeps DB setup fast
    // and makes the full run deterministic (the root cause behind the flakes,
    // not just a higher ceiling).
    maxWorkers: "50%",
    minWorkers: 1,
    // Migrations under (even capped) parallel load; give setup hooks headroom.
    hookTimeout: 30_000,
    // Integration tests (PGlite queries, full React workspace renders) can take
    // well over the 5s default under parallel load. Kept below hookTimeout so a
    // genuinely hung test still surfaces.
    testTimeout: 20_000,
    include: [
      "components/**/*.test.{ts,tsx}",
      "data/**/*.test.ts",
      "lib/**/*.test.{ts,tsx}",
      "app/**/*.test.{ts,tsx}",
    ],
  },
});
