import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: ["**/live-session-*.spec.ts"],
  fullyParallel: true,
  workers: 2,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "pnpm dev:relay",
      url: "http://127.0.0.1:9100/health",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "pnpm dev:test",
      url: "http://127.0.0.1:3100",
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
