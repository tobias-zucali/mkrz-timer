import { expect, test } from "@playwright/test"

import {
  enableRemoteMode,
  expectTimerPaused,
  expectTimerRunning,
  openClientFromSettings,
} from "./remote-mode.helpers"

test("syncs start and pause actions between main and three clients", async ({
  page,
}) => {
  test.setTimeout(60_000)

  const clientUrl = await enableRemoteMode(page)
  const clients = []

  for (let index = 0; index < 3; index += 1) {
    clients.push(await openClientFromSettings(page, clientUrl))
  }

  await expect(page.getByTestId("peer-debug-state")).toHaveAttribute(
    "data-connection-count",
    "3",
    {
      timeout: 30_000,
    },
  )
  await expect(page.getByTestId("peer-debug-state")).toHaveAttribute(
    "data-peer-role",
    "main",
  )
  await expect(page.getByTestId("peer-debug-state")).toHaveAttribute(
    "data-peer-status",
    "connected",
  )

  await Promise.all(
    clients.map(async (client) => {
      await expect(client.getByTestId("peer-debug-state")).toHaveAttribute(
        "data-peer-role",
        "client",
      )
      await expect(client.getByTestId("peer-debug-state")).toHaveAttribute(
        "data-peer-status",
        "connected",
      )
      await expect(client.getByTestId("peer-debug-state")).toHaveAttribute(
        "data-connection-count",
        "1",
      )
    }),
  )

  await page.getByRole("button", { exact: true, name: "Close" }).click()

  await page.getByRole("button", { name: "START" }).click()
  await Promise.all([page, ...clients].map(expectTimerRunning))

  await page.getByRole("button", { name: "PAUSE" }).click()
  await Promise.all([page, ...clients].map(expectTimerPaused))

  await clients[0].getByRole("button", { name: "START" }).click()
  await Promise.all([page, ...clients].map(expectTimerRunning))

  await clients[0].getByRole("button", { name: "PAUSE" }).click()
  await Promise.all([page, ...clients].map(expectTimerPaused))
})
