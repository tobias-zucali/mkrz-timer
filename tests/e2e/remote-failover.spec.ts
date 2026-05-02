import { expect, test } from "@playwright/test"

import {
  closeSettingsOverlay,
  enableRemoteMode,
  expectTimerPaused,
  expectTimerRunning,
  expectTimersToMatch,
  getMainPage,
  openClientsFromSettings,
  waitForRemoteCluster,
} from "./remote-mode.helpers"

test("elects a new main when the original main closes and lets the original main rejoin as a client", async ({
  page,
}) => {
  test.setTimeout(150_000)

  const clientUrl = await enableRemoteMode(page)
  const clients = await openClientsFromSettings(page, clientUrl, 3)

  await closeSettingsOverlay(page)

  await expect(page.getByTestId("peer-debug-state")).toHaveAttribute(
    "data-connection-count",
    "3",
    {
      timeout: 30_000,
    },
  )

  await page.close({ runBeforeUnload: true })

  await waitForRemoteCluster(clients, {
    clientCount: 2,
    mainConnectionCount: 2,
    message: "two clients should reconnect to the newly elected main",
  })

  const rejoinedMain = await clients[0].context().newPage()
  await rejoinedMain.goto(clientUrl)
  await expect(rejoinedMain.getByRole("button", { name: "START" })).toBeVisible()

  await waitForRemoteCluster([...clients, rejoinedMain], {
    clientCount: 3,
    mainConnectionCount: 3,
    message: "the original main should rejoin as a client after the cluster stabilizes",
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

test("survives two consecutive main failovers while timer actions stay in sync", async ({
  page,
}) => {
  test.setTimeout(180_000)

  const clientUrl = await enableRemoteMode(page)
  const clients = await openClientsFromSettings(page, clientUrl, 4)

  await closeSettingsOverlay(page)

  await expect(page.getByTestId("peer-debug-state")).toHaveAttribute(
    "data-connection-count",
    "4",
    {
      timeout: 30_000,
    },
  )

  await page.getByRole("button", { name: "START" }).click()
  await Promise.all([page, ...clients].map(expectTimerRunning))

  await page.close({ runBeforeUnload: true })

  await waitForRemoteCluster(clients, {
    clientCount: 3,
    mainConnectionCount: 3,
    message: "three clients should reconnect after the original main closes",
  })

  const firstElectedMain = await getMainPage(clients)
  await firstElectedMain.getByRole("button", { name: "PAUSE" }).click()
  await Promise.all(clients.map(expectTimerPaused))
  await expectTimersToMatch(clients)

  await firstElectedMain.close({ runBeforeUnload: true })

  const remainingClients = clients.filter((client) => client !== firstElectedMain)
  await waitForRemoteCluster(remainingClients, {
    clientCount: 2,
    mainConnectionCount: 2,
    message: "two clients should reconnect after the elected main closes",
  })

  const secondElectedMain = await getMainPage(remainingClients)
  await secondElectedMain.getByRole("button", { name: "START" }).click()
  await Promise.all(remainingClients.map(expectTimerRunning))

  await secondElectedMain.getByRole("button", { name: "PAUSE" }).click()
  await Promise.all(remainingClients.map(expectTimerPaused))
  await expectTimersToMatch(remainingClients)
})
