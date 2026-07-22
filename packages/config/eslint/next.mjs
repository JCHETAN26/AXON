import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

import { reactConfig } from "./react.mjs";

/**
 * ESLint config for Next.js apps: react + Next.js rules.
 * @type {import("typescript-eslint").ConfigArray}
 */
export const nextConfig = tseslint.config(...reactConfig, {
  plugins: {
    "@next/next": nextPlugin,
  },
  rules: {
    ...nextPlugin.configs.recommended.rules,
    ...nextPlugin.configs["core-web-vitals"].rules,
  },
});

export default nextConfig;
