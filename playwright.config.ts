import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "pnpm dev:peer",
      url: "http://127.0.0.1:9000/peerjs/id",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "pnpm dev:e2e",
      env: {
        NEXT_PUBLIC_PEERJS_HOST: "127.0.0.1",
        NEXT_PUBLIC_PEERJS_PORT: "9000",
        NEXT_PUBLIC_PEERJS_SECURE: "false",
      },
      url: "http://127.0.0.1:3000",
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
