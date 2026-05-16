import { expect, test } from "@playwright/test"

import {
  closeSettingsOverlay,
  enableRemoteModeWithClientUrls,
  expectRemoteStatus,
  expectScreenshotWithoutDebugInfo,
  expectReadonlyTimerControls,
  expectReadonlyPlaceholder,
  expectTimerDisplayRunning,
  expectTimerPaused,
  expectTimerRunning,
  expectTimerSettings,
  expectTimerTitleValue,
  getDisplayedSeconds,
  openSettingsOverlay,
  openClientFromSettings,
  openClientsFromSettings,
  openTimer,
  updateTimerSettings,
  waitForRemoteCluster,
} from "./remote-mode.helpers"

test(
  "normalizes hostile query params without executing script-like content",
  { tag: "@smoke" },
  async ({ page }) => {
    await page.goto(
      "/?title=%20%3Cimg%20src%3Dx%20onerror%3D%22window.__timerInjected%3D1%22%3E%20&bg=javascript:alert(1)&fg=ABCDEF&pc=ff00gg&m=9999&s=-1",
    )

    await expectTimerTitleValue(
      page,
      ' <img src=x onerror="window.__timerInjected=1"> ',
    )
    await expect
      .poll(() =>
        page.evaluate(() => {
          const params = new URLSearchParams(window.location.search)
          return Object.fromEntries(params.entries())
        }),
      )
      .toEqual({
        bg: "000000",
        fg: "abcdef",
        m: "01",
        pc: "d61f69",
        s: "00",
        title: ' <img src=x onerror="window.__timerInjected=1"> ',
      })
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & { __timerInjected?: number }).__timerInjected ??
            null,
        ),
      )
      .toBe(null)
  },
)

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

test("keeps the main remote page local and ends remote mode cleanly", async ({
  page,
}) => {
  await enableRemoteModeWithClientUrls(page)

  await expect(page).toHaveURL(/\/control\//)
  await expect(page.getByRole("switch", { name: "Remote mode" })).toBeChecked()
  await page.getByRole("switch", { name: "Remote mode" }).click()
  await expect
    .poll(() => page.evaluate(() => window.location.pathname))
    .toBe("/")
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.fromEntries(new URLSearchParams(window.location.search)),
      ),
    )
    .toEqual({
      bg: "000000",
      fg: "ffffff",
      m: "01",
      pc: "d61f69",
      s: "00",
    })
  await openSettingsOverlay(page)
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

    await expect(readonlyClient).not.toHaveURL(/\/control\//)
    await expectReadonlyTimerControls(readonlyClient)
    const initialReadonlySeconds = await getDisplayedSeconds(readonlyClient)

    await readonlyClient.keyboard.press(" ")
    await expect
      .poll(() => getDisplayedSeconds(readonlyClient), {
        message: "readonly client keyboard shortcuts must not start the timer",
        timeout: 2_000,
      })
      .toBe(initialReadonlySeconds)

    await page.getByRole("button", { name: "START" }).click()
    await expectTimerRunning(page)

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

test(
  "shares hostile title payloads as inert plain text across clients",
  { tag: "@smoke" },
  async ({ page }) => {
    const { readonlyClientUrl } = await enableRemoteModeWithClientUrls(page)
    const readonlyClient = await openClientFromSettings(
      page,
      readonlyClientUrl,
      "Viewer Link",
    )

    await closeSettingsOverlay(page)
    await waitForRemoteCluster([page, readonlyClient], {
      clientCount: 1,
      mainConnectionCount: 1,
      message: "readonly client should connect before hostile title sync",
    })

    const hostileTitle = '<svg onload="window.__syncInjected=1"></svg>'

    await openSettingsOverlay(page)
    await updateTimerSettings(page, { title: hostileTitle })
    await closeSettingsOverlay(page)

    await Promise.all([
      expectTimerTitleValue(page, hostileTitle),
      expectTimerTitleValue(readonlyClient, hostileTitle),
    ])
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & { __syncInjected?: number }).__syncInjected ??
            null,
        ),
      )
      .toBe(null)
    await expect
      .poll(() =>
        readonlyClient.evaluate(
          () =>
            (window as Window & { __syncInjected?: number }).__syncInjected ??
            null,
        ),
      )
      .toBe(null)
  },
)

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

test("keeps the remote mode toggle visible after an offline remote-mode start", async ({
  page,
}) => {
  await openTimer(page, 3)
  await openSettingsOverlay(page)
  await page.context().setOffline(true)

  const remoteModeToggle = page.getByRole("switch", { name: "Remote mode" })

  await remoteModeToggle.click({
    force: true,
  })
  await expect(remoteModeToggle).toBeVisible()
  await page.context().setOffline(false)
})

test("shows a recoverable error for malformed viewer links", async ({
  page,
}) => {
  await page.goto("/view")

  await expectRemoteStatus(page, {
    connectionSummary: "Recovery needs a retry",
    errorText:
      /Remote session link is malformed\. Check the URL and try again\./,
    role: "Readonly session",
    state: "Reconnect failed",
  })
  await expect(page.getByTestId("readonly-timer-placeholder")).toContainText(
    "Recovery needs a retry",
  )
  await expect(page.getByTestId("readonly-timer-placeholder")).toContainText(
    "Reconnect failed",
  )
  await expect(page.getByTestId("readonly-timer-placeholder")).toContainText(
    "Remote session link is malformed. Check the URL and try again.",
  )
  await expect(page.getByRole("button", { name: "Settings" })).toHaveCount(0)
})

test(
  "matches the malformed viewer-link error state",
  { tag: "@visual" },
  async ({ page }) => {
    await page.goto("/view")

    const styleTag = await page.addStyleTag({
      content: `
        [data-testid="remote-status-activity-log"] { display: none !important; }
      `,
    })

    try {
      await expectScreenshotWithoutDebugInfo(page, {
        fullPage: true,
        message:
          "malformed viewer-link error state should stay visually stable",
        name: "remote-malformed-viewer-link-error.png",
      })
    } finally {
      await styleTag.evaluate((node) => {
        node.parentNode?.removeChild(node)
      })
    }
  },
)

test("controller links can restore control and reused viewer links rejoin the session", async ({
  page,
}) => {
  const { controlClientUrl, readonlyClientUrl } =
    await enableRemoteModeWithClientUrls(page)

  await page.getByRole("switch", { name: "Remote mode" }).click()
  await expect(
    page.getByRole("switch", { name: "Remote mode" }),
  ).not.toBeChecked()

  const controlClient = await page.context().newPage()
  await controlClient.goto(controlClientUrl)
  await expect(
    controlClient.getByRole("button", { name: "START" }),
  ).toBeVisible({
    timeout: 30_000,
  })
  await expect(controlClient).toHaveURL(/\/control\//)

  const readonlyClient = await page.context().newPage()
  await readonlyClient.goto(readonlyClientUrl)
  await expectReadonlyPlaceholder(readonlyClient)
  await waitForRemoteCluster([controlClient, readonlyClient], {
    clientCount: 1,
    mainConnectionCount: 1,
    message: "restored control and reused viewer links should reconnect",
  })
  await expect(readonlyClient).toHaveURL(/\/view\//)
  await expectRemoteStatus(controlClient, {
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
  await expectReadonlyTimerControls(readonlyClient)
})

test(
  "matches the expired viewer-link error state",
  { tag: "@visual" },
  async ({ page }) => {
    const { readonlyClientUrl } = await enableRemoteModeWithClientUrls(page)

    await page.getByRole("switch", { name: "Remote mode" }).click()
    await expect(
      page.getByRole("switch", { name: "Remote mode" }),
    ).not.toBeChecked()
    await page.waitForTimeout(250)

    const expiredViewerPage = await page.context().newPage()
    await expiredViewerPage.goto(readonlyClientUrl)

    const styleTag = await expiredViewerPage.addStyleTag({
      content: `
        [data-testid="remote-status-activity-log"] { display: none !important; }
      `,
    })

    try {
      await expectScreenshotWithoutDebugInfo(expiredViewerPage, {
        fullPage: true,
        message: "expired viewer-link error state should stay visually stable",
        name: "remote-expired-viewer-link-error.png",
      })
    } finally {
      await styleTag.evaluate((node) => {
        node.parentNode?.removeChild(node)
      })
    }
  },
)
