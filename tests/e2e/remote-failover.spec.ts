import { expect, test } from "@playwright/test"

import {
  closeSettingsOverlay,
  enableRemoteMode,
  enableRemoteModeWithClientUrls,
  expectRemoteStatus,
  expectReadonlyTimerControls,
  expectTimerDisplayRunning,
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

  await expect(page.getByTestId("remote-status")).toHaveAttribute(
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

  const electedMain = await getMainPage(clients)
  await expectRemoteStatus(electedMain, {
    connectionSummary: "2 connected peers",
    description: "Hosting the remote timer session.",
    role: "Main host",
    state: "Connected",
  })

  const rejoinedMain = await clients[0].context().newPage()
  await rejoinedMain.goto(clientUrl)
  await expect(
    rejoinedMain.getByRole("button", { name: "START" }),
  ).toBeVisible()

  await waitForRemoteCluster([...clients, rejoinedMain], {
    clientCount: 3,
    mainConnectionCount: 3,
    message:
      "the original main should rejoin as a client after the cluster stabilizes",
  })

  await expect(rejoinedMain.getByTestId("remote-status")).toHaveAttribute(
    "data-peer-role",
    "client",
  )
  await expect(rejoinedMain.getByTestId("remote-status")).toHaveAttribute(
    "data-peer-status",
    "connected",
  )
  await expectRemoteStatus(rejoinedMain, {
    connectionSummary: "Connected to host",
    description: "Can control the shared timer and settings.",
    role: "Control client",
    state: "Connected",
  })
})

test("survives two consecutive main failovers while timer actions stay in sync", async ({
  page,
}) => {
  test.setTimeout(180_000)

  const clientUrl = await enableRemoteMode(page)
  const clients = await openClientsFromSettings(page, clientUrl, 4)

  await closeSettingsOverlay(page)

  await expect(page.getByTestId("remote-status")).toHaveAttribute(
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

  const remainingClients = clients.filter(
    (client) => client !== firstElectedMain,
  )
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

test("keeps mixed readonly and control clients synced after main failover", async ({
  page,
}) => {
  test.setTimeout(150_000)

  const { controlClientUrl, readonlyClientUrl } =
    await enableRemoteModeWithClientUrls(page)
  const controlClients = await openClientsFromSettings(
    page,
    controlClientUrl,
    2,
  )
  const readonlyClients = await openClientsFromSettings(
    page,
    readonlyClientUrl,
    2,
    "Viewer Link",
  )
  const clients = [...controlClients, ...readonlyClients]

  await closeSettingsOverlay(page)
  await waitForRemoteCluster([page, ...clients], {
    clientCount: 4,
    mainConnectionCount: 4,
    message: "mixed clients should connect before failover",
  })

  await Promise.all(readonlyClients.map(expectReadonlyTimerControls))

  await page.getByRole("button", { name: "START" }).click()
  await Promise.all(controlClients.map(expectTimerRunning))
  await Promise.all(readonlyClients.map(expectTimerDisplayRunning))

  await page.close({ runBeforeUnload: true })

  await waitForRemoteCluster(clients, {
    clientCount: 3,
    mainConnectionCount: 3,
    message: "mixed clients should reconnect after the original main closes",
  })

  await expectRemoteStatus(readonlyClients[0], {
    connectionSummary: "Connected to host",
    description: "Viewing the shared timer without controls.",
    role: "Readonly client",
    state: "Connected",
  })

  await controlClients[0].getByRole("button", { name: "PAUSE" }).click()
  await Promise.all(controlClients.map(expectTimerPaused))
  await expectTimersToMatch(clients)
  await Promise.all(readonlyClients.map(expectReadonlyTimerControls))
})

test("shows connecting status while a control client cannot reach the host session", async ({
  page,
}) => {
  const clientUrl = await enableRemoteMode(page)
  const blockedClient = await page.context().newPage()
  await blockedClient.route(
    "http://127.0.0.1:9100/peerjs/**",
    async (route) => {
      await route.abort()
    },
  )
  await blockedClient.goto(clientUrl)

  await closeSettingsOverlay(page)
  await expectRemoteStatus(blockedClient, {
    connectionSummary: "Waiting for host connection",
    description: "Joining the shared timer with control access.",
    peerServerReachability: "Unreachable",
    role: "Control client",
    state: "Connecting",
  })
})
