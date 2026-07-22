import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

import { baseConfig } from "./base.mjs";

/**
 * ESLint config for React packages: base + hooks + accessibility.
 * @type {import("typescript-eslint").ConfigArray}
 */
export const reactConfig = tseslint.config(...baseConfig, jsxA11y.flatConfigs.recommended, {
  plugins: {
    "react-hooks": reactHooks,
  },
  rules: {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "error",
  },
});

export default reactConfig;
