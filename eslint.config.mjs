import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import eslintConfigPrettier from "eslint-config-prettier/flat"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-e2e/**",
    ".next-agent/**",
    ".next-agent-e2e/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "playwright-report-agent/**",
    "test-results/**",
    "test-results-agent/**",
  ]),
  {
    rules: {
      "no-console": "error",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
])

export default eslintConfig
