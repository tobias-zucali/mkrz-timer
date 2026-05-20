import { defineConfig, globalIgnores } from "eslint/config"
import betterTailwindcss from "eslint-plugin-better-tailwindcss"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import eslintConfigPrettier from "eslint-config-prettier/flat"
import { getDefaultSelectors } from "eslint-plugin-better-tailwindcss/defaults"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    ...betterTailwindcss.configs.recommended,
    settings: {
      "better-tailwindcss": {
        cwd: ".",
        entryPoint: "./src/app/globals.css",
        selectors: [
          ...getDefaultSelectors(),
          {
            kind: "callee",
            match: [{ type: "string" }, { type: "objectKey" }],
            name: "^classNames$",
          },
          {
            kind: "variable",
            match: [{ type: "string" }],
            name: "^.*ClassNames?$",
          },
        ],
        tailwindConfig: "./tailwind.config.ts",
      },
    },
    rules: {
      ...betterTailwindcss.configs.recommended.rules,
      "better-tailwindcss/enforce-consistent-line-wrapping": "off",
    },
  },
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
      // Prettier reflows multiline JSX class strings differently than this rule.
      "better-tailwindcss/enforce-consistent-line-wrapping": "off",
      "no-console": "error",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
])

export default eslintConfig
