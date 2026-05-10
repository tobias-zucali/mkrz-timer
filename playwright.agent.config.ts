import path from "node:path"

import { defineConfig, devices } from "@playwright/test"

const nodeExec = process.env.PLAYWRIGHT_NODE || process.execPath
const peerScriptPath = path.join(process.cwd(), "scripts/dev-peer.mjs")
const nextBinPath = path.join(process.cwd(), "node_modules/next/dist/bin/next")

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report-agent" }],
  ],
  outputDir: "test-results-agent",
  use: {
    baseURL: "http://127.0.0.1:3300",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: `${nodeExec} ${peerScriptPath}`,
      env: {
        ...process.env,
        PEERJS_PORT: "9200",
      },
      url: "http://127.0.0.1:9200/peerjs/id",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: `${nodeExec} ${nextBinPath} dev -H 127.0.0.1 -p 3300`,
      env: {
        ...process.env,
        NEXT_DIST_DIR: ".next-agent-e2e",
        NEXT_PUBLIC_PEERJS_HOST: "127.0.0.1",
        NEXT_PUBLIC_PEERJS_PATH: "/",
        NEXT_PUBLIC_PEERJS_PORT: "9200",
        NEXT_PUBLIC_PEERJS_SECURE: "false",
      },
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
