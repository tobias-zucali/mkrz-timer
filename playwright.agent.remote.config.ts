import path from "node:path"

import { defineConfig, devices } from "@playwright/test"

const nodeExec = process.env.PLAYWRIGHT_NODE || process.execPath
const laneScriptPath = path.join(process.cwd(), "scripts/agent-lane.mjs")

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/live-session-*.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report-agent-remote" }],
  ],
  outputDir: "test-results-agent-remote",
  use: {
    baseURL: "http://127.0.0.1:3300",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: `${nodeExec} ${laneScriptPath} serve relay`,
      url: "http://127.0.0.1:9200/health",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: `${nodeExec} ${laneScriptPath} serve app --role=test`,
      url: "http://127.0.0.1:3300",
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
