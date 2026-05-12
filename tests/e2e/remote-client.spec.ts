import { expect, test } from "@playwright/test"

import {
  closeSettingsOverlay,
  enableRemoteModeWithClientUrls,
  expectRemoteStatus,
  expectReadonlyTimerControls,
  expectReadonlyPlaceholder,
  expectTimerDisplayRunning,
  expectTimerPaused,
  expectTimerRunning,
  expectTimerSettings,
  getDisplayedSeconds,
  openSettingsOverlay,
  openClientFromSettings,
  openClientsFromSettings,
  openTimer,
  updateTimerSettings,
  waitForRemoteCluster,
} from "./remote-mode.helpers"

test(
  "opens settings, enables remote mode, and opens a client timer",
  { tag: "@smoke" },
  async ({ page }) => {
    const { controlClientUrl } = await enableRemoteModeWithClientUrls(page)
    const clientPage = await openClientFromSettings(page, controlClientUrl)
    await expect(
      clientPage.getByRole("button", { name: "START" }),
    ).toBeVisible()
    await closeSettingsOverlay(page)
    await expect(page.getByRole("button", { name: "START" })).toBeVisible()
  },
)

test("marks the main remote page as control and clears remote params when ending", async ({
  page,
}) => {
  await enableRemoteModeWithClientUrls(page)

  await expect(page).toHaveURL(/(?:\?|&)control=42(?:&|$)/)
  await expect(page.getByRole("switch", { name: "Remote mode" })).toBeChecked()
  await page.getByRole("switch", { name: "Remote mode" }).click()
  await expect(page).not.toHaveURL(/(?:\?|&)control=42(?:&|$)/)
  await expect(page).not.toHaveURL(/(?:\?|&)rid=/)
  await expect(
    page.getByRole("switch", { name: "Remote mode" }),
  ).not.toBeChecked()
})

test(
  "opens readonly clients without controls or settings",
  { tag: "@smoke" },
  async ({ page }) => {
    const { readonlyClientUrl } = await enableRemoteModeWithClientUrls(page)
    const readonlyClient = await openClientFromSettings(
      page,
      readonlyClientUrl,
      "Viewer Link",
    )

    await expectReadonlyPlaceholder(readonlyClient)

    await closeSettingsOverlay(page)
    await waitForRemoteCluster([page, readonlyClient], {
      clientCount: 1,
      mainConnectionCount: 1,
      message: "readonly client should connect to the main timer",
    })

    await expectRemoteStatus(page, {
      connectionSummary: "Controlling with 1 other participant",
      networkStatus: "Online",
      role: "Control session",
      state: "Connected",
    })
    await expectRemoteStatus(readonlyClient, {
      connectionSummary: "Viewing with 1 other participant",
      networkStatus: "Online",
      role: "Readonly session",
      state: "Connected",
    })

    await expect(readonlyClient).not.toHaveURL(/control=42/)
    await expectReadonlyTimerControls(readonlyClient)

    await page.getByRole("button", { name: "START" }).click()
    await expectTimerRunning(page)

    const initialReadonlySeconds = await getDisplayedSeconds(readonlyClient)
    await expect
      .poll(() => getDisplayedSeconds(readonlyClient), {
        message: "readonly client should keep receiving timer updates",
        timeout: 5_000,
      })
      .toBeLessThan(initialReadonlySeconds)
  },
)

test("syncs mixed readonly and control clients", async ({ page }) => {
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
  const allPages = [page, ...controlClients, ...readonlyClients]

  await closeSettingsOverlay(page)
  await waitForRemoteCluster(allPages, {
    clientCount: 4,
    mainConnectionCount: 4,
    message: "mixed readonly and control clients should connect",
  })

  await expectRemoteStatus(page, {
    connectionSummary: "Controlling with 4 other participants",
    networkStatus: "Online",
    role: "Control session",
    state: "Connected",
  })
  await expectRemoteStatus(controlClients[0], {
    connectionSummary: "Controlling with 4 other participants",
    networkStatus: "Online",
    role: "Control session",
    state: "Connected",
  })
  await expectRemoteStatus(readonlyClients[0], {
    connectionSummary: "Viewing with 4 other participants",
    networkStatus: "Online",
    role: "Readonly session",
    state: "Connected",
  })

  await Promise.all(readonlyClients.map(expectReadonlyTimerControls))

  await page.getByRole("button", { name: "START" }).click()
  await Promise.all(controlClients.map(expectTimerRunning))
  await Promise.all(readonlyClients.map(expectTimerDisplayRunning))
  await controlClients[0].getByRole("button", { name: "PAUSE" }).click()
  await Promise.all(controlClients.map(expectTimerPaused))

  const settings = {
    title: "Mixed clients",
  }

  await controlClients[0].getByRole("button", { name: "Settings" }).click()
  await updateTimerSettings(controlClients[0], settings)
  await controlClients[0]
    .getByRole("button", { exact: true, name: "Close" })
    .click()

  await Promise.all(
    allPages.map((remotePage) => expectTimerSettings(remotePage, settings)),
  )
  await Promise.all(readonlyClients.map(expectReadonlyTimerControls))
})

test("shows offline network status when the browser loses connectivity", async ({
  page,
}) => {
  const { controlClientUrl } = await enableRemoteModeWithClientUrls(page)
  const controlClient = await openClientFromSettings(page, controlClientUrl)

  await closeSettingsOverlay(page)
  await waitForRemoteCluster([page, controlClient], {
    clientCount: 1,
    mainConnectionCount: 1,
    message: "control client should connect before offline status test",
  })

  await controlClient.context().setOffline(true)

  await expectRemoteStatus(controlClient, {
    connectionSummary:
      /Controlling with 1 other participant|Restoring relay connection|Waiting for timer sync/,
    networkStatus: "Offline",
    role: "Control session",
    state: /Connected|Reconnecting/,
  })

  await controlClient.context().setOffline(false)
})

test(
  "keeps the remote mode toggle visible after an offline remote-mode start",
  { tag: "@smoke" },
  async ({ page }) => {
    await openTimer(page, 3)
    await openSettingsOverlay(page)
    await page.context().setOffline(true)

    await page.getByRole("switch", { name: "Remote mode" }).click()

    await expectRemoteStatus(page, {
      connectionSummary:
        /Inactive|Waiting for timer sync|Recovery needs a retry/,
      networkStatus: "Offline",
      role: /Local timer|Control session/,
      showSendToDeveloperButton: true,
      state: /Ready|Connecting|Reconnect failed|Attention needed/,
    })

    await expect(
      page.getByRole("switch", { name: "Remote mode" }),
    ).toBeVisible()
    await page.context().setOffline(false)
  },
)
