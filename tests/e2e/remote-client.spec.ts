import { expect, Page, test } from "@playwright/test"

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
  openSidebarPanel,
  openTimer,
  updateTimerSettings,
  waitForRemoteCluster,
} from "./remote-mode.helpers"

async function getRemoteTitleMetrics(page: Page) {
  const titleRoot = page.getByTestId("timer-title")
  const readonlyTitle = titleRoot.getByTestId("timer-title-text")

  if ((await readonlyTitle.count()) > 0) {
    return readonlyTitle.evaluate((node, root) => {
      const element = node as HTMLElement
      const rootElement = document.querySelector(
        `[data-testid="${root}"]`,
      ) as HTMLElement | null
      const computedStyle = window.getComputedStyle(element)

      return {
        fontSize: Number.parseFloat(computedStyle.fontSize),
        rootHeight: rootElement?.getBoundingClientRect().height ?? 0,
        text: element.textContent ?? "",
      }
    }, "timer-title")
  }

  return titleRoot.getByTestId("timer-title-input").evaluate((node, root) => {
    const element = node as HTMLElement
    const rootElement = document.querySelector(
      `[data-testid="${root}"]`,
    ) as HTMLElement | null
    const computedStyle = window.getComputedStyle(element)

    return {
      fontSize: Number.parseFloat(computedStyle.fontSize),
      rootHeight: rootElement?.getBoundingClientRect().height ?? 0,
      text: (node as HTMLTextAreaElement).value,
    }
  }, "timer-title")
}

test(
  "normalizes hostile query params without executing script-like content",
  { tag: "@smoke" },
  async ({ page }) => {
    await page.goto(
      "/?v=1&t=60!d61f69!%20%3Cimg%20src%3Dx%20onerror%3D%22window.__timerInjected%3D1%22%3E%20!0&bg=javascript:alert(1)&fg=ABCDEF",
    )

    await expectTimerTitleValue(
      page,
      ' <img src=x onerror="window.__timerInjected=1"> ',
    )
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
  "opens settings, starts a live session, and opens a client timer",
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

test("keeps the main live page local and ends the live session cleanly", async ({
  page,
}) => {
  await enableRemoteModeWithClientUrls(page)

  await expect
    .poll(() => page.evaluate(() => window.location.pathname))
    .toBe("/")
  await openSidebarPanel(page, "Share")
  await expect(
    page.getByRole("button", { name: "End live session" }),
  ).toBeVisible()
  const documentSentinel = await page.evaluate(() => {
    const sentinel = `sentinel-${Math.random().toString(36).slice(2)}`
    ;(
      window as typeof window & { __playwrightDocumentSentinel?: string }
    ).__playwrightDocumentSentinel = sentinel
    return sentinel
  })
  await page.getByRole("button", { name: "End live session" }).click()
  await expect
    .poll(() => page.evaluate(() => window.location.pathname))
    .toBe("/")
  await expect
    .poll(() =>
      page
        .evaluate(
          () =>
            (
              window as typeof window & {
                __playwrightDocumentSentinel?: string
              }
            ).__playwrightDocumentSentinel ?? null,
        )
        .catch(() => null),
    )
    .toBe(documentSentinel)
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.fromEntries(new URLSearchParams(window.location.search)),
      ),
    )
    .toEqual({
      t: "60!d61f69!!0",
      v: "1",
    })
  await openSidebarPanel(page, "Share")
  await expect(
    page.getByRole("button", { name: "Start live session" }),
  ).toBeVisible()
})

test(
  "opens readonly clients without controls or settings",
  { tag: "@smoke" },
  async ({ page }) => {
    const { readonlyClientUrl } = await enableRemoteModeWithClientUrls(page)
    const readonlyClient = await openClientFromSettings(
      page,
      readonlyClientUrl,
      "Viewer link",
    )

    await expectReadonlyPlaceholder(readonlyClient)

    await closeSettingsOverlay(page)
    await waitForRemoteCluster([page, readonlyClient], {
      clientCount: 1,
      mainConnectionCount: 1,
      message: "readonly client should connect to the main timer",
    })

    await expectRemoteStatus(page, {
      connectionSummary: /Synchronized|Reconnect in progress/,
      networkStatus: "Online",
      role: "Control access",
      state: /Connected|Connection interrupted|Reconnecting\.\.\./,
    })
    await expectRemoteStatus(readonlyClient, {
      connectionSummary: /Synchronized|Reconnect in progress/,
      networkStatus: "Online",
      role: "Viewer access",
      state: /Connected|Connection interrupted|Reconnecting\.\.\./,
    })
    await closeSettingsOverlay(page)

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

test("readonly clients expose fullscreen share and status overlays", async ({
  page,
}) => {
  const { readonlyClientUrl } = await enableRemoteModeWithClientUrls(page)
  const readonlyClient = await openClientFromSettings(
    page,
    readonlyClientUrl,
    "Viewer link",
  )

  await closeSettingsOverlay(page)
  await waitForRemoteCluster([page, readonlyClient], {
    clientCount: 1,
    mainConnectionCount: 1,
    message: "readonly client should connect before overlay assertions",
  })

  await readonlyClient
    .getByRole("button", { name: "Share viewer link" })
    .click()
  const qrCodeDialog = readonlyClient.getByRole("dialog", {
    name: "Timer · Viewer link",
  })
  await expect(qrCodeDialog).toBeVisible()
  const qrCodeBounds = await qrCodeDialog.boundingBox()
  const qrViewport = readonlyClient.viewportSize()

  expect(qrCodeBounds?.width).toBe(qrViewport?.width)
  expect(qrCodeBounds?.height).toBe(qrViewport?.height)
  await qrCodeDialog.click()
  await expect(qrCodeDialog).not.toBeVisible()

  await readonlyClient.getByTestId("remote-status-toggle").click()
  const offcanvas = readonlyClient.getByTestId("sidebar-offcanvas")
  await expect(readonlyClient.getByTestId("sidebar-panel-status")).toBeVisible()
  const offcanvasBounds = await offcanvas.boundingBox()
  const statusViewport = readonlyClient.viewportSize()

  expect(offcanvasBounds?.width).toBe(statusViewport?.width)
  expect(offcanvasBounds?.height).toBe(statusViewport?.height)
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
    "Viewer link",
  )
  const allPages = [page, ...controlClients, ...readonlyClients]

  await closeSettingsOverlay(page)
  await waitForRemoteCluster(allPages, {
    clientCount: 4,
    mainConnectionCount: 4,
    message: "mixed readonly and control clients should connect",
  })

  await expectRemoteStatus(page, {
    connectionSummary: "Synchronized",
    networkStatus: "Online",
    role: "Control access",
    state: "Connected",
  })
  await expectRemoteStatus(controlClients[0], {
    connectionSummary: "Synchronized",
    networkStatus: "Online",
    role: "Control access",
    state: "Connected",
  })
  await expectRemoteStatus(readonlyClients[0], {
    connectionSummary: "Synchronized",
    networkStatus: "Online",
    role: "Viewer access",
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

  await openSidebarPanel(controlClients[0], "Timer")
  await updateTimerSettings(controlClients[0], settings)
  await closeSettingsOverlay(controlClients[0])

  await Promise.all(
    allPages.map((remotePage) => expectTimerSettings(remotePage, settings)),
  )
  await Promise.all(readonlyClients.map(expectReadonlyTimerControls))
})

test("keeps long multiline titles readable in readonly remote clients", async ({
  page,
}) => {
  const { readonlyClientUrl } = await enableRemoteModeWithClientUrls(page)
  const readonlyClient = await openClientFromSettings(
    page,
    readonlyClientUrl,
    "Viewer link",
  )

  await closeSettingsOverlay(page)
  await waitForRemoteCluster([page, readonlyClient], {
    clientCount: 1,
    mainConnectionCount: 1,
    message: "readonly client should connect before multiline title sync",
  })

  const longTitle = "Quarterly planning\nretrospective and facilitator notes"

  await openSettingsOverlay(page)
  await updateTimerSettings(page, { title: longTitle })
  await closeSettingsOverlay(page)

  await Promise.all([
    expectTimerTitleValue(page, longTitle),
    expectTimerTitleValue(readonlyClient, longTitle),
  ])

  const [controlMetrics, readonlyMetrics] = await Promise.all([
    getRemoteTitleMetrics(page),
    getRemoteTitleMetrics(readonlyClient),
  ])

  expect(controlMetrics.text).toBe(longTitle)
  expect(readonlyMetrics.text).toBe(longTitle)
  expect(controlMetrics.rootHeight).toBeLessThan(160)
  expect(readonlyMetrics.rootHeight).toBeLessThan(160)
  expect(readonlyMetrics.fontSize).toBeGreaterThan(0)
})

test(
  "shares hostile title payloads as inert plain text across clients",
  { tag: "@smoke" },
  async ({ page }) => {
    const { readonlyClientUrl } = await enableRemoteModeWithClientUrls(page)
    const readonlyClient = await openClientFromSettings(
      page,
      readonlyClientUrl,
      "Viewer link",
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
      /Reconnect in progress|Restoring synchronization|Synchronized/,
    networkStatus: "Offline",
    role: "Control access",
    state: /Connected|Connection interrupted|Reconnecting\.\.\./,
  })

  await controlClient.context().setOffline(false)
})

test("keeps the live session action visible after an offline start", async ({
  page,
}) => {
  await openTimer(page, 3)
  await openSidebarPanel(page, "Share")
  await page.context().setOffline(true)
  const viewportSize = page.viewportSize()
  const documentSentinel = await page.evaluate(() => {
    const sentinel = `sentinel-${Math.random().toString(36).slice(2)}`
    ;(
      window as typeof window & { __playwrightDocumentSentinel?: string }
    ).__playwrightDocumentSentinel = sentinel
    return sentinel
  })

  await expect
    .poll(async () => {
      const box = await page
        .getByRole("button", { name: "Start live session" })
        .boundingBox()

      if (!box || !viewportSize) {
        return false
      }

      return (
        box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= viewportSize.width &&
        box.y + box.height <= viewportSize.height
      )
    })
    .toBe(true)

  await page
    .getByRole("button", { name: "Start live session" })
    .evaluate((element) => {
      ;(element as HTMLButtonElement).click()
    })
  await expect(page.getByTestId("sidebar-panel-share")).toBeVisible()
  await expect(page.getByText("Live session", { exact: true })).toBeVisible()
  await expect(page.getByText("Local share", { exact: true })).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __playwrightDocumentSentinel?: string })
            .__playwrightDocumentSentinel ?? null,
      ),
    )
    .toBe(documentSentinel)
  await page.context().setOffline(false)
})

test("shows a recoverable error for malformed viewer links", async ({
  page,
}) => {
  await page.goto("/view")

  await expectRemoteStatus(page, {
    connectionSummary: "Error",
    errorText: /Live session link is malformed\. Check the URL and try again\./,
    role: "Viewer access",
    state: "Error",
  })
  await expect(page.getByTestId("readonly-timer-placeholder")).toContainText(
    "Error",
  )
  await expect(page.getByTestId("readonly-timer-placeholder")).toContainText(
    "Live session link is malformed. Check the URL and try again.",
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

  await openSidebarPanel(page, "Share")
  await page.getByRole("button", { name: "End live session" }).click()
  await expect(
    page.getByRole("button", { name: "Start live session" }),
  ).toBeVisible()

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
    connectionSummary: "Synchronized",
    networkStatus: "Online",
    role: "Control access",
    state: "Connected",
  })
  await expectRemoteStatus(readonlyClient, {
    connectionSummary: "Synchronized",
    networkStatus: "Online",
    role: "Viewer access",
    state: "Connected",
  })
  await expectReadonlyTimerControls(readonlyClient)
})

test(
  "matches the expired viewer-link error state",
  { tag: "@visual" },
  async ({ page }) => {
    const { readonlyClientUrl } = await enableRemoteModeWithClientUrls(page)

    await openSidebarPanel(page, "Share")
    await page.getByRole("button", { name: "End live session" }).click()
    await expect(
      page.getByRole("button", { name: "Start live session" }),
    ).toBeVisible()
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
