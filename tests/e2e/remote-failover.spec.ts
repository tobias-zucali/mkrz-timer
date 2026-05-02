import { expect, Page, test } from "@playwright/test"

import {
  closeSettingsOverlay,
  enableRemoteMode,
  getPeerDebugState,
  openClientFromSettings,
} from "./remote-mode.helpers"

// The flow is documented as a fixme for now because remote bootstrap can remain
// stuck on "Connecting to server..." under Playwright in this environment, so
// the failover behavior itself cannot be verified reliably yet.
test("elects a new main when the original main closes and lets the original main rejoin as a client", async ({
  page,
}) => {
  test.setTimeout(150_000)

  const originalMainUrl = page.url()
  const clientUrl = await enableRemoteMode(page)
  const clients: Page[] = []

  for (let index = 0; index < 3; index += 1) {
    clients.push(await openClientFromSettings(page, clientUrl))
  }

  await closeSettingsOverlay(page)

  await expect(page.getByTestId("peer-debug-state")).toHaveAttribute(
    "data-connection-count",
    "3",
    {
      timeout: 30_000,
    },
  )

  const currentMainUrl = page.url() || originalMainUrl

  await page.close({ runBeforeUnload: true })

  await expect
    .poll(async () => {
      const states = await Promise.all(clients.map(getPeerDebugState))

      return {
        connectedClients: states.filter(
          ({ connectionCount, role, status }) =>
            connectionCount === "1" && role === "client" && status === "connected",
        ).length,
        electedMain: states.filter(
          ({ connectionCount, role, status }) =>
            connectionCount === "2" && role === "main" && status === "connected",
        ).length,
      }
    }, {
      timeout: 45_000,
      message: "two clients should reconnect to the newly elected main",
    })
    .toEqual({
      connectedClients: 2,
      electedMain: 1,
    })

  const rejoinedMain = await clients[0].context().newPage()
  await rejoinedMain.goto(currentMainUrl)
  await expect(rejoinedMain.getByRole("button", { name: "START" })).toBeVisible()

  await expect
    .poll(async () => {
      const states = await Promise.all([...clients, rejoinedMain].map(getPeerDebugState))

      return {
        connectedClients: states.filter(
          ({ connectionCount, role, status }) =>
            connectionCount === "1" && role === "client" && status === "connected",
        ).length,
        electedMain: states.filter(
          ({ connectionCount, role, status }) =>
            connectionCount === "3" && role === "main" && status === "connected",
        ).length,
      }
    }, {
      timeout: 45_000,
      message: "the original main should rejoin as a client after the cluster stabilizes",
    })
    .toEqual({
      connectedClients: 3,
      electedMain: 1,
    })

  await expect(rejoinedMain.getByTestId("peer-debug-state")).toHaveAttribute(
    "data-peer-role",
    "client",
  )
  await expect(rejoinedMain.getByTestId("peer-debug-state")).toHaveAttribute(
    "data-peer-status",
    "connected",
  )
})
