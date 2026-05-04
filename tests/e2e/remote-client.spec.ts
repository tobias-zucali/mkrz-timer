import { expect, test } from "@playwright/test"

import {
  closeSettingsOverlay,
  enableRemoteModeWithClientUrls,
  expectReadonlyTimerControls,
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

test("opens settings, enables remote mode, and opens a client timer", async ({
  page,
}) => {
  const { controlClientUrl } = await enableRemoteModeWithClientUrls(page)
  const clientPage = await openClientFromSettings(page, controlClientUrl)
  await expect(clientPage.getByRole("button", { name: "START" })).toBeVisible()
  await closeSettingsOverlay(page)
  await expect(page.getByRole("button", { name: "START" })).toBeVisible()
})

test("marks the main remote page as control and clears remote params when ending", async ({
  page,
}) => {
  await enableRemoteModeWithClientUrls(page)

  await expect(page).toHaveURL(/(?:\?|&)control=42(?:&|$)/)
  await page.getByRole("button", { name: "End remote mode" }).click()
  await expect(page).not.toHaveURL(/(?:\?|&)control=42(?:&|$)/)
  await expect(page).not.toHaveURL(/(?:\?|&)rid=/)
  await expect(
    page.getByRole("button", { name: "Switch to remote mode" }),
  ).toBeVisible()
})

test("opens readonly clients without controls or settings", async ({
  page,
}) => {
  const { readonlyClientUrl } = await enableRemoteModeWithClientUrls(page)
  const readonlyClient = await openClientFromSettings(
    page,
    readonlyClientUrl,
    "Readonly Client URL",
  )

  await closeSettingsOverlay(page)
  await waitForRemoteCluster([page, readonlyClient], {
    clientCount: 1,
    mainConnectionCount: 1,
    message: "readonly client should connect to the main timer",
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
})

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
    "Readonly Client URL",
  )
  const allPages = [page, ...controlClients, ...readonlyClients]

  await closeSettingsOverlay(page)
  await waitForRemoteCluster(allPages, {
    clientCount: 4,
    mainConnectionCount: 4,
    message: "mixed readonly and control clients should connect",
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

test("shows a remote mode start error when the PeerJS server is unavailable", async ({
  page,
}) => {
  await page.route("http://127.0.0.1:9100/peerjs/**", async (route) => {
    await route.abort()
  })

  await openTimer(page, 3)
  await openSettingsOverlay(page)

  await page.getByRole("button", { name: "Switch to remote mode" }).click()

  await expect(page.getByTestId("remote-mode-status")).toHaveText(
    "Remote mode is starting...",
  )
  await expect(page.getByTestId("global-error-alert")).toContainText(
    "Remote mode could not start.",
    { timeout: 15_000 },
  )
  await expect(page.getByTestId("remote-mode-status")).toHaveText(
    "Remote mode is off.",
  )
  await expect(page.getByTestId("remote-mode-error")).toHaveCount(0)
  await expect(page).not.toHaveURL(/(?:\?|&)rid=/)
  await expect(
    page.getByRole("button", { name: "Switch to remote mode" }),
  ).toBeVisible()
})
