import { expect, type BrowserContext, type Page, test } from "@playwright/test"

import {
  closeSettingsOverlay,
  enableLiveSession,
  expectControlClientUrlParams,
  expectLiveSessionOnlyUrl,
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
  openSidebarPanel,
  openClientsFromSettings,
  relayUrl,
  updateTimerSettings,
  waitForRemoteCluster,
} from "./live-session.helpers"

async function openIsolatedClient(
  page: Page,
  clientUrl: string,
): Promise<{ client: Page; context: BrowserContext }> {
  const browser = page.context().browser()
  if (!browser) {
    throw new Error("Playwright browser is unavailable")
  }

  const context = await browser.newContext()
  const client = await context.newPage()
  await client.goto(clientUrl)
  await expect(
    client.getByRole("button", { name: /^Open session status\./ }),
  ).toHaveCount(1)

  return {
    client,
    context,
  }
}

test(
  "syncs start and pause actions between main and one control client",
  { tag: "@smoke" },
  async ({ page }) => {
    test.setTimeout(60_000)

    const clientUrl = await enableLiveSession(page)
    const controlClient = await openClientFromSettings(page, clientUrl)

    await closeSettingsOverlay(page)

    await waitForRemoteCluster([page, controlClient], {
      clientCount: 1,
      mainConnectionCount: 1,
      message: "remote cluster should stabilize before sync smoke actions",
    })

    await page.getByRole("button", { name: "START" }).click()
    await Promise.all([page, controlClient].map(expectTimerRunning))

    await page.getByRole("button", { name: "PAUSE" }).click()
    await Promise.all([page, controlClient].map(expectTimerPaused))

    await controlClient.getByRole("button", { name: "START" }).click()
    await Promise.all([page, controlClient].map(expectTimerRunning))

    await controlClient.getByRole("button", { name: "PAUSE" }).click()
    await Promise.all([page, controlClient].map(expectTimerPaused))
  },
)

test("keeps state consistent when multiple peers control the timer quickly", async ({
  page,
}) => {
  test.setTimeout(90_000)

  const clientUrl = await enableLiveSession(page)
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

  const clientUrl = await enableLiveSession(page)
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

test("silently republishes offline control changes when the relay stayed unchanged", async ({
  page,
}) => {
  test.setTimeout(90_000)

  const clientUrl = await enableLiveSession(page)
  const { client: isolatedControlClient, context: isolatedControlContext } =
    await openIsolatedClient(page, clientUrl)

  try {
    await closeSettingsOverlay(page)
    await waitForRemoteCluster([page, isolatedControlClient], {
      clientCount: 1,
      mainConnectionCount: 1,
      message:
        "isolated control client should connect before local-only recovery",
    })

    await isolatedControlContext.setOffline(true)
    await isolatedControlClient.getByRole("button", { name: "START" }).click()
    await expectTimerRunning(isolatedControlClient)
    await expectTimerPaused(page)

    await isolatedControlContext.setOffline(false)
    await Promise.all([
      expectTimerRunning(page),
      expectTimerRunning(isolatedControlClient),
    ])
    await expect(
      isolatedControlClient.getByRole("dialog", {
        name: "Live session state changed during recovery.",
      }),
    ).toHaveCount(0)
  } finally {
    await isolatedControlContext.close()
  }
})

test("rejoins readonly clients after a controller restores an offline session", async ({
  page,
}) => {
  test.setTimeout(90_000)

  await enableLiveSession(page)
  const readonlyClient = await openClientFromSettings(
    page,
    await page.getByRole("textbox", { name: "Viewer link" }).inputValue(),
    "Viewer link",
  )

  await closeSettingsOverlay(page)
  await waitForRemoteCluster([page, readonlyClient], {
    clientCount: 1,
    mainConnectionCount: 1,
    message: "readonly client should connect before offline restore",
  })

  await page.getByRole("button", { name: "START" }).click()
  await Promise.all([
    expectTimerRunning(page),
    expectTimerDisplayRunning(readonlyClient),
  ])

  await page.context().setOffline(true)

  await page.getByRole("button", { name: "PAUSE" }).click()
  await expectTimerPaused(page)

  await page.context().setOffline(false)
  await expectTimerPaused(page)
  await expect
    .poll(() => getDisplayedSeconds(readonlyClient), {
      message: "readonly client should receive the restored paused timer value",
      timeout: 20_000,
    })
    .toBeGreaterThan(0)
  await expectTimersToMatch([page, readonlyClient])
})

test("silently accepts relay changes when an offline controller made no local edits", async ({
  page,
}) => {
  test.setTimeout(90_000)

  const clientUrl = await enableLiveSession(page)
  const { client: isolatedControlClient, context: isolatedControlContext } =
    await openIsolatedClient(page, clientUrl)

  try {
    await closeSettingsOverlay(page)
    await waitForRemoteCluster([page, isolatedControlClient], {
      clientCount: 1,
      mainConnectionCount: 1,
      message:
        "isolated control client should connect before relay-only recovery",
    })

    await isolatedControlContext.setOffline(true)
    await page.getByRole("button", { name: "START" }).click()
    await expectTimerRunning(page)
    await expectTimerPaused(isolatedControlClient)

    await isolatedControlContext.setOffline(false)
    await Promise.all([
      expectTimerRunning(page),
      expectTimerRunning(isolatedControlClient),
    ])
    await expect(
      isolatedControlClient.getByRole("dialog", {
        name: "Live session state changed during recovery.",
      }),
    ).toHaveCount(0)
  } finally {
    await isolatedControlContext.close()
  }
})

test("ignores malformed relay payload attempts without breaking active clients", async ({
  page,
}) => {
  await enableLiveSession(page)
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

  const clientUrl = await enableLiveSession(page)
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

test("new clients inherit host settings without resetting the session", async ({
  page,
}) => {
  test.setTimeout(120_000)

  const clientUrl = await enableLiveSession(page)
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
  await openSidebarPanel(page, "Share")
  const controlLinkField = page.getByRole("textbox", { name: "Control link" })
  const viewerLinkField = page.getByRole("textbox", { name: "Viewer link" })
  await expect(controlLinkField).toHaveValue(/\/control\//)
  await expect(viewerLinkField).toHaveValue(/\/view\//)
  const currentControlUrl = await controlLinkField.inputValue()
  const currentViewerUrl = await viewerLinkField.inputValue()

  const controlClient = await openClientFromSettings(
    page,
    currentControlUrl || clientUrl,
  )
  const readonlyClient = await openClientFromSettings(
    page,
    currentViewerUrl || viewerUrl,
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
  await expectLiveSessionOnlyUrl(readonlyClient)

  await Promise.all(
    allPages.map((remotePage) =>
      expectTimerSettings(remotePage, inheritedSettings),
    ),
  )
})
