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
    include: [
      "components/**/*.test.{ts,tsx}",
      "data/**/*.test.ts",
      "lib/**/*.test.{ts,tsx}",
      "app/**/*.test.{ts,tsx}",
    ],
  },
});
