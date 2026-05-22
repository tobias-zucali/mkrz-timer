import { expect, test } from "@playwright/test"

import {
  closeSettingsOverlay,
  enableRemoteMode,
  expectScreenshotWithoutDebugInfo,
  expectControlClientUrlParams,
  expectRemoteSessionOnlyUrl,
  expectTimerDisplayRunning,
  expectTimerControlsToMatch,
  expectTimerPaused,
  expectTimerRunning,
  expectTimerSettings,
  expectTimersToMatch,
  expectUrlQrCode,
  getDisplayedSeconds,
  openClientFromSettings,
  openSettingsOverlay,
  openClientsFromSettings,
  relayUrl,
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

    await waitForRemoteCluster([page, ...clients], {
      clientCount: 3,
      mainConnectionCount: 3,
      message: "remote cluster should stabilize before sync smoke actions",
    })

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

  await expect(page.getByTestId("remote-status")).toHaveAttribute(
    "data-connection-count",
    "4",
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

  await expect(page.getByTestId("remote-status")).toHaveAttribute(
    "data-connection-count",
    "4",
    {
      timeout: 30_000,
    },
  )

  await Promise.all([page, ...clients].map(expectTimerPaused))

  await page.getByRole("button", { name: "START" }).click()
  await Promise.all([page, ...clients].map(expectTimerRunning))

  await clients[2].close({ runBeforeUnload: true })
  const activePages = [page, clients[0], clients[1]]

  await expect(page.getByTestId("remote-status")).toHaveAttribute(
    "data-connection-count",
    "3",
    {
      timeout: 30_000,
    },
  )

  await clients[0].getByRole("button", { name: "PAUSE" }).click()
  await Promise.all(activePages.map(expectTimerPaused))
  const pausedSecondsByActivePage = await Promise.all(
    activePages.map(getDisplayedSeconds),
  )
  const pausedMin = Math.min(...pausedSecondsByActivePage)
  const pausedMax = Math.max(...pausedSecondsByActivePage)

  const rejoinedClient = await page.context().newPage()
  await rejoinedClient.goto(clientUrl)

  await waitForRemoteCluster([...activePages, rejoinedClient], {
    clientCount: 3,
    mainConnectionCount: 3,
    message:
      "rejoined client should reconnect before asserting synced timer state",
  })

  await Promise.all([...activePages, rejoinedClient].map(expectTimerPaused))
  await expect
    .poll(() => getDisplayedSeconds(rejoinedClient), {
      message:
        "rejoined client should receive a paused timer value that matches the active cluster",
      timeout: 10_000,
    })
    .toBeGreaterThanOrEqual(pausedMin - 1)
  await expect
    .poll(() => getDisplayedSeconds(rejoinedClient), {
      message:
        "rejoined client should receive a paused timer value that stays within the active cluster range",
      timeout: 10_000,
    })
    .toBeLessThanOrEqual(pausedMax + 1)

  await rejoinedClient.getByRole("button", { name: "START" }).click()
  await Promise.all([...activePages, rejoinedClient].map(expectTimerRunning))

  await page.getByRole("button", { name: "PAUSE" }).click()
  await Promise.all([...activePages, rejoinedClient].map(expectTimerPaused))
  await expectTimersToMatch([...activePages, rejoinedClient])
})

test("ignores malformed relay payload attempts without breaking active clients", async ({
  page,
}) => {
  await enableRemoteMode(page)
  const readonlyClient = await openClientFromSettings(
    page,
    await page.getByRole("textbox", { name: "Viewer link" }).inputValue(),
    "Viewer link",
  )

  await closeSettingsOverlay(page)
  await waitForRemoteCluster([page, readonlyClient], {
    clientCount: 1,
    mainConnectionCount: 1,
    message: "remote cluster should connect before malformed relay payloads",
  })

  await page.evaluate(
    async (wsUrl) => {
      await new Promise<void>((resolve) => {
        const socket = new WebSocket(wsUrl)
        const finish = () => resolve()

        socket.addEventListener("error", finish, { once: true })
        socket.addEventListener(
          "open",
          () => {
            socket.send("not-json")
            socket.send(
              JSON.stringify({
                clientId: "attacker",
                params: { title: "<script>boom()</script>" },
                sessionId: "<bad>",
                type: "sync",
              }),
            )
            socket.send("x".repeat(20_000))
            socket.close()
            window.setTimeout(finish, 100)
          },
          { once: true },
        )

        window.setTimeout(finish, 2_000)
      })
    },
    `${relayUrl.replace(/^http/, "ws")}/ws`,
  )

  await page.getByRole("button", { name: "START" }).click()
  await expectTimerRunning(page)
  await expectTimerDisplayRunning(readonlyClient)
  await page.getByRole("button", { name: "PAUSE" }).click()
  await expectTimerPaused(page)
  await expectTimersToMatch([page, readonlyClient])
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
  await expectUrlQrCode(page, "Control link")
  await updateTimerSettings(page, mainSettings)
  await closeSettingsOverlay(page)

  await Promise.all(
    allPages.map((remotePage) => expectTimerSettings(remotePage, mainSettings)),
  )
  await expectControlClientUrlParams(page, mainSettings)
  await Promise.all(
    clients.map((remotePage) =>
      expectControlClientUrlParams(remotePage, mainSettings),
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
  await expectControlClientUrlParams(page, clientSettings)
  await Promise.all(
    clients.map((remotePage) =>
      expectControlClientUrlParams(remotePage, clientSettings),
    ),
  )
})

test("controller routes block on URL-vs-server conflicts until the user picks server state", async ({
  page,
}) => {
  test.setTimeout(90_000)

  const clientUrl = await enableRemoteMode(page)
  const hostSettings = {
    backgroundColor: "#123456",
    foregroundColor: "#fefefe",
    minutes: "02",
    primaryColor: "#00aa88",
    seconds: "15",
    title: "Server state",
  }

  await updateTimerSettings(page, hostSettings)
  await closeSettingsOverlay(page)

  const conflictingUrl = new URL(await clientUrl)
  conflictingUrl.search = "v=1&t=45!ff8800!URL%20Override!0&bg=111111&fg=eeeeee"

  const controlClient = await page.context().newPage()
  await controlClient.goto(conflictingUrl.toString())

  const conflictDialog = controlClient.getByRole("dialog", {
    name: "Live session state changed during recovery.",
  })
  await expect(conflictDialog).toBeVisible()
  await expect(
    conflictDialog.getByRole("button", { name: "Use server state" }),
  ).toBeFocused()
  await controlClient.keyboard.press("Enter")

  await expect(conflictDialog).not.toBeVisible()
  await expectTimerSettings(controlClient, hostSettings)
})

test("controller routes can overwrite server state from URL params after a conflict", async ({
  page,
}) => {
  test.setTimeout(90_000)

  const clientUrl = await enableRemoteMode(page)
  const hostSettings = {
    backgroundColor: "#123456",
    foregroundColor: "#fefefe",
    minutes: "02",
    primaryColor: "#00aa88",
    seconds: "15",
    title: "Server state",
  }
  const urlSettings = {
    backgroundColor: "#111111",
    foregroundColor: "#eeeeee",
    minutes: "00",
    primaryColor: "#ff8800",
    seconds: "45",
    title: "URL Override",
  }

  await updateTimerSettings(page, hostSettings)
  await closeSettingsOverlay(page)

  const conflictingUrl = new URL(await clientUrl)
  conflictingUrl.search = "v=1&t=45!ff8800!URL%20Override!0&bg=111111&fg=eeeeee"

  const controlClient = await page.context().newPage()
  await controlClient.goto(conflictingUrl.toString())

  const conflictDialog = controlClient.getByRole("dialog", {
    name: "Live session state changed during recovery.",
  })
  await expect(conflictDialog).toBeVisible()
  await expect(
    conflictDialog.getByRole("button", {
      name: "Use server state",
    }),
  ).toBeFocused()
  await controlClient.keyboard.press("Tab")
  await expect(
    conflictDialog.getByRole("button", {
      name: "Push local changes",
    }),
  ).toBeFocused()
  await controlClient.keyboard.press("Space")

  await expect(conflictDialog).not.toBeVisible()
  await expectTimerSettings(page, urlSettings)
  await expectTimerSettings(controlClient, urlSettings)
})

test(
  "matches the blocking control sync-conflict dialog",
  { tag: "@visual" },
  async ({ page }) => {
    test.setTimeout(90_000)

    const clientUrl = await enableRemoteMode(page)
    const hostSettings = {
      backgroundColor: "#123456",
      foregroundColor: "#fefefe",
      minutes: "02",
      primaryColor: "#00aa88",
      seconds: "15",
      title: "Server state",
    }

    await updateTimerSettings(page, hostSettings)
    await closeSettingsOverlay(page)

    const conflictingUrl = new URL(await clientUrl)
    conflictingUrl.search =
      "v=1&t=45!ff8800!URL%20Override!0&bg=111111&fg=eeeeee"

    const controlClient = await page.context().newPage()
    await controlClient.goto(conflictingUrl.toString())

    const conflictDialog = controlClient.getByRole("dialog", {
      name: "Live session state changed during recovery.",
    })
    await expect(conflictDialog).toBeVisible()

    const styleTag = await controlClient.addStyleTag({
      content: `
        [data-testid="remote-status-activity-log"] { display: none !important; }
      `,
    })

    try {
      await expectScreenshotWithoutDebugInfo(controlClient, {
        fullPage: true,
        message: "sync-conflict dialog should stay visually stable",
        name: "remote-control-sync-conflict-dialog.png",
      })
    } finally {
      await styleTag.evaluate((node) => {
        node.parentNode?.removeChild(node)
      })
    }
  },
)

test("new clients inherit host settings without resetting the session", async ({
  page,
}) => {
  test.setTimeout(120_000)

  const clientUrl = await enableRemoteMode(page)
  const viewerUrl = await page
    .getByRole("textbox", { name: "Viewer link" })
    .inputValue()

  const mainSettings = {
    backgroundColor: "#2456ab",
    foregroundColor: "#f6f1de",
    minutes: "03",
    primaryColor: "#f97316",
    seconds: "20",
    title: "Host tuned",
  }
  const inheritedSettings = {
    backgroundColor: mainSettings.backgroundColor,
    foregroundColor: mainSettings.foregroundColor,
    minutes: mainSettings.minutes,
    primaryColor: mainSettings.primaryColor,
    seconds: mainSettings.seconds,
  }

  await expectUrlQrCode(page, "Control link")
  await updateTimerSettings(page, mainSettings)
  await expectTimerSettings(page, mainSettings)

  const controlClient = await openClientFromSettings(page, clientUrl)
  const readonlyClient = await openClientFromSettings(
    page,
    viewerUrl,
    "Viewer link",
  )
  const allPages = [page, controlClient, readonlyClient]

  await closeSettingsOverlay(page)
  await waitForRemoteCluster(allPages, {
    clientCount: 2,
    mainConnectionCount: 2,
    message: "newly opened clients should join the tuned host session",
  })

  await Promise.all(
    allPages.map((remotePage) =>
      expectTimerSettings(remotePage, inheritedSettings),
    ),
  )
  await expectControlClientUrlParams(page, mainSettings)
  await expectControlClientUrlParams(controlClient, mainSettings)
  await expectRemoteSessionOnlyUrl(readonlyClient)

  await Promise.all(
    allPages.map((remotePage) =>
      expectTimerSettings(remotePage, inheritedSettings),
    ),
  )
})
