import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3300"
const managedRuntime = process.env.PLAYWRIGHT_MANAGED_RUNTIME === "1"
const outputDir = process.env.PLAYWRIGHT_OUTPUT_DIR || "test-results-remote"
const reportDir =
  process.env.PLAYWRIGHT_REPORT_DIR || "playwright-report-remote"

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/live-session/**/*.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: reportDir }]],
  outputDir,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: managedRuntime
    ? undefined
    : [
        {
          command: "pnpm dev:test",
          url: baseURL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
