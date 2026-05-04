import { expect, test } from "@playwright/test"

import {
  closeSettingsOverlay,
  enableRemoteMode,
  expectTimerControlsToMatch,
  expectTimerPaused,
  expectTimerRunning,
  expectTimerSettings,
  expectTimerUrlParams,
  expectUrlQrCode,
  expectTimersToMatch,
  getDisplayedSeconds,
  openSettingsOverlay,
  openClientsFromSettings,
  updateTimerSettings,
  waitForRemoteCluster,
} from "./remote-mode.helpers"

test(
  "syncs start and pause actions between main and three clients",
  { tag: "@smoke" },
  async ({ page }) => {
    test.setTimeout(60_000)

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

    await page.getByRole("button", { name: "START" }).click()
    await Promise.all([page, ...clients].map(expectTimerRunning))

    await page.getByRole("button", { name: "PAUSE" }).click()
    await Promise.all([page, ...clients].map(expectTimerPaused))

    await clients[0].getByRole("button", { name: "START" }).click()
    await Promise.all([page, ...clients].map(expectTimerRunning))

    await clients[0].getByRole("button", { name: "PAUSE" }).click()
    await Promise.all([page, ...clients].map(expectTimerPaused))
  },
)

test("keeps state consistent when multiple peers control the timer quickly", async ({
  page,
}) => {
  test.setTimeout(90_000)

  const clientUrl = await enableRemoteMode(page)
  const clients = await openClientsFromSettings(page, clientUrl, 3)
  const allPages = [page, ...clients]

  await closeSettingsOverlay(page)

  await expect(page.getByTestId("peer-debug-state")).toHaveAttribute(
    "data-connection-count",
    "3",
    {
      timeout: 30_000,
    },
  )

  await page.getByRole("button", { name: "START" }).click()
  if ((await expectTimerControlsToMatch(allPages)) === "paused") {
    await page.getByRole("button", { name: "START" }).click()
  }
  await Promise.all(allPages.map(expectTimerRunning))

  await Promise.all([
    clients[0].getByRole("button", { name: "PAUSE" }).click(),
    clients[1].getByRole("button", { name: "PAUSE" }).click(),
  ])
  if ((await expectTimerControlsToMatch(allPages)) === "running") {
    await page.getByRole("button", { name: "PAUSE" }).click()
  }
  await Promise.all(allPages.map(expectTimerPaused))
  await expectTimersToMatch(allPages)

  await Promise.all([
    page.getByRole("button", { name: "START" }).click(),
    clients[2].getByRole("button", { name: "START" }).click(),
  ])
  if ((await expectTimerControlsToMatch(allPages)) === "paused") {
    await page.getByRole("button", { name: "START" }).click()
  }
  await Promise.all(allPages.map(expectTimerRunning))

  await clients[1].getByRole("button", { name: "RESET" }).click()
  await Promise.all(allPages.map(expectTimerPaused))
  await expectTimersToMatch(allPages, 60)
})

test("syncs the current timer state to a client that rejoins during active control changes", async ({
  page,
}) => {
  test.setTimeout(90_000)

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

  await page.getByRole("button", { name: "START" }).click()
  await Promise.all([page, ...clients].map(expectTimerRunning))

  await clients[2].close({ runBeforeUnload: true })
  const activePages = [page, clients[0], clients[1]]

  await expect(page.getByTestId("peer-debug-state")).toHaveAttribute(
    "data-connection-count",
    "2",
    {
      timeout: 30_000,
    },
  )

  await clients[0].getByRole("button", { name: "PAUSE" }).click()
  await Promise.all(activePages.map(expectTimerPaused))
  const pausedAt = await getDisplayedSeconds(page)

  const rejoinedClient = await page.context().newPage()
  await rejoinedClient.goto(clientUrl)

  await waitForRemoteCluster([...activePages, rejoinedClient], {
    clientCount: 3,
    mainConnectionCount: 3,
    message:
      "rejoined client should reconnect before asserting synced timer state",
  })

  await Promise.all([...activePages, rejoinedClient].map(expectTimerPaused))
  await expectTimersToMatch([...activePages, rejoinedClient], pausedAt, 1)

  await rejoinedClient.getByRole("button", { name: "START" }).click()
  await Promise.all([...activePages, rejoinedClient].map(expectTimerRunning))

  await page.getByRole("button", { name: "PAUSE" }).click()
  await Promise.all([...activePages, rejoinedClient].map(expectTimerPaused))
  await expectTimersToMatch([...activePages, rejoinedClient])
})

test("syncs settings changes from main and clients", async ({ page }) => {
  test.setTimeout(120_000)

  const clientUrl = await enableRemoteMode(page)
  const clients = await openClientsFromSettings(page, clientUrl, 3)
  const allPages = [page, ...clients]

  await closeSettingsOverlay(page)

  await waitForRemoteCluster(allPages, {
    clientCount: 3,
    mainConnectionCount: 3,
    message: "remote cluster should stabilize before settings sync",
  })

  const mainSettings = {
    backgroundColor: "#123456",
    foregroundColor: "#fefefe",
    minutes: "02",
    primaryColor: "#00aa88",
    seconds: "15",
    title: "Main settings",
  }

  await openSettingsOverlay(page)
  await expectUrlQrCode(page, "Control Client URL")
  await updateTimerSettings(page, mainSettings)
  await closeSettingsOverlay(page)

  await Promise.all(
    allPages.map((remotePage) => expectTimerSettings(remotePage, mainSettings)),
  )
  await Promise.all(
    allPages.map((remotePage) =>
      expectTimerUrlParams(remotePage, mainSettings),
    ),
  )

  const clientSettings = {
    backgroundColor: "#1a2b3c",
    foregroundColor: "#ddeeff",
    minutes: "00",
    primaryColor: "#ff8800",
    seconds: "45",
    title: "Client settings",
  }

  await openSettingsOverlay(clients[1])
  await updateTimerSettings(clients[1], clientSettings)
  await closeSettingsOverlay(clients[1])

  await Promise.all(
    allPages.map((remotePage) =>
      expectTimerSettings(remotePage, clientSettings),
    ),
  )
  await Promise.all(
    allPages.map((remotePage) =>
      expectTimerUrlParams(remotePage, clientSettings),
    ),
  )
})
