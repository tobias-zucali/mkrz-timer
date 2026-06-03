import type { Page } from "@playwright/test"

import {
  closeSettingsOverlay,
  enableLiveSessionWithClientUrls,
  expectLiveSessionStatus,
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
  resolveRecoveryDialogIfPresent,
  updateTimerSettings,
  waitForRemoteCluster,
} from "./live-session.helpers"
import { expect, test } from "./test"

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

async function expectParticipantLabels(
  page: Page,
  expectedLabels: Array<"Control" | "View" | "You">,
) {
  const panel = page.getByTestId("remote-status-panel")
  if (!(await panel.isVisible().catch(() => false))) {
    if (
      (await page
        .getByRole("button", { name: "Toggle navigation" })
        .count()) === 0
    ) {
      await page
        .getByRole("button", { name: /^Open session status\./ })
        .click({ force: true })
    } else {
      await openSidebarPanel(page, "Status")
    }
  }

  const detailsToggle = panel.getByRole("button", {
    name: "Connection details",
  })
  if ((await detailsToggle.getAttribute("aria-expanded")) !== "true") {
    await detailsToggle.click()
  }

  const connectionList = page.getByTestId("remote-status-connections")
  await expect(connectionList).toBeVisible()
  const rows = connectionList.getByTestId("remote-status-connection")

  await expect(rows).toHaveCount(expectedLabels.length)

  for (const [index, label] of expectedLabels.entries()) {
    await expect(rows.nth(index)).toContainText(label)
  }
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
    const { controlClientUrl } = await enableLiveSessionWithClientUrls(page)
    const clientPage = await openClientFromSettings(page, controlClientUrl)
    await expect(clientPage.locator("body")).toMatchAriaSnapshot({
      name: "remote-control-client-screen.aria.yml",
    })
    await expect(
      clientPage.getByRole("button", { name: "START" }),
    ).toBeVisible()
    await closeSettingsOverlay(page)
    await expect(page.getByRole("button", { name: "START" })).toBeVisible()
  },
)

test("includes selected settings in remote viewer and control links when enabled", async ({
  page,
}) => {
  await openTimer(page, 3)
  await updateTimerSettings(page, {
    backgroundColor: "#123456",
    soundId: "b",
    ttsEnabled: true,
  })
  await openSidebarPanel(page, "Share")
  await page.getByRole("button", { name: "Start live session" }).click()
  await expect
    .poll(() => page.evaluate(() => window.location.pathname))
    .toMatch(/^\/control\/.+/)

  const viewerLink = page.getByRole("textbox", { name: "Viewer link" })
  const controlLink = page.getByRole("textbox", { name: "Control link" })

  await expect(viewerLink).toHaveValue(/\/view\/.+(?:\?|&)bg=123456(?:&|$)/)
  await expect(viewerLink).toHaveValue(/(?:\?|&)s=b(?:&|$)/)
  await expect(viewerLink).toHaveValue(/(?:\?|&)ts=1(?:&|$)/)
  await expect(controlLink).toHaveValue(/\/control\/.+(?:\?|&)bg=123456(?:&|$)/)

  await page
    .getByRole("checkbox", {
      name: "Include Voice & Sound settings in links",
    })
    .uncheck()

  await expect(viewerLink).not.toHaveValue(/(?:\?|&)bg=123456(?:&|$)/)
  await expect(viewerLink).not.toHaveValue(/(?:\?|&)s=b(?:&|$)/)
  await expect(viewerLink).not.toHaveValue(/(?:\?|&)ts=1(?:&|$)/)
  await expect(controlLink).not.toHaveValue(/(?:\?|&)bg=123456(?:&|$)/)
})

test("moves the host onto the control route and ends the live session cleanly", async ({
  page,
}) => {
  await enableLiveSessionWithClientUrls(page)

  await expect
    .poll(() => page.evaluate(() => window.location.pathname))
    .toMatch(/^\/control\/.+/)
  await openSidebarPanel(page, "Share")
  await resolveRecoveryDialogIfPresent(page)
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
  await resolveRecoveryDialogIfPresent(page)
  await openSidebarPanel(page, "Share")
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
      a: "0",
      t: "60!d61f69!!1!0",
      v: "1",
    })
  await openSidebarPanel(page, "Share")
  await expect(
    page.getByRole("button", { name: "Start live session" }),
  ).toBeVisible()
})

test("confirms before ending a live session when other clients are connected", async ({
  page,
}) => {
  const { readonlyClientUrl } = await enableLiveSessionWithClientUrls(page)
  const readonlyClient = await openClientFromSettings(
    page,
    readonlyClientUrl,
    "Viewer link",
  )

  await closeSettingsOverlay(page)
  await waitForRemoteCluster([page, readonlyClient], {
    clientCount: 1,
    mainConnectionCount: 1,
    message: "viewer should connect before end-session confirmation appears",
  })

  await openSidebarPanel(page, "Share")
  await page.getByRole("button", { name: "End live session" }).click()

  const confirmationDialog = page.getByRole("alertdialog", {
    name: "End the live session for everyone?",
  })
  await expect(confirmationDialog).toBeVisible()
  await expect(confirmationDialog).toMatchAriaSnapshot({
    name: "remote-end-session-confirmation-dialog.aria.yml",
  })
  await expect(
    confirmationDialog.getByText(
      "This will disconnect 1 other client from the live session immediately.",
    ),
  ).toBeVisible()

  await confirmationDialog
    .getByRole("button", { name: "Keep live session open" })
    .click()
  await expect(confirmationDialog).not.toBeVisible()
  await expect(readonlyClient).toHaveURL(/\/view\//)
  await expectReadonlyTimerControls(readonlyClient)

  await page.getByRole("button", { name: "End live session" }).click()
  await confirmationDialog
    .getByRole("button", { name: "End live session" })
    .click()
  await expect(
    page.getByRole("button", { name: "Start live session" }),
  ).toBeVisible()
})

test("warns before closing a control client while other participants stay connected", async ({
  page,
}) => {
  const { controlClientUrl } = await enableLiveSessionWithClientUrls(page)
  const controlClient = await openClientFromSettings(page, controlClientUrl)

  await closeSettingsOverlay(page)
  await waitForRemoteCluster([page, controlClient], {
    clientCount: 1,
    mainConnectionCount: 1,
    message: "control client should connect before unload confirmation test",
  })

  const dialogPromise = controlClient.waitForEvent("dialog")
  const closePromise = controlClient.close({ runBeforeUnload: true })
  const dialog = await dialogPromise

  expect(dialog.type()).toBe("beforeunload")
  await dialog.dismiss()
  await closePromise

  await expect(controlClient).toHaveURL(/\/control\//)
  await expect(
    controlClient.getByRole("button", { name: "START" }),
  ).toBeVisible()
})

test(
  "opens readonly clients without controls or settings",
  { tag: "@smoke" },
  async ({ page }) => {
    const { readonlyClientUrl } = await enableLiveSessionWithClientUrls(page)
    const readonlyClient = await openClientFromSettings(
      page,
      readonlyClientUrl,
      "Viewer link",
    )

    await expectReadonlyPlaceholder(readonlyClient)

    await closeSettingsOverlay(page)

    await expectLiveSessionStatus(page, {
      connectionSummary: /Synchronized|Reconnect in progress/,
      networkStatus: "Online",
      role: "Control access",
      state: /Connected|Disconnected|Reconnecting\.\.\./,
    })
    await expectLiveSessionStatus(readonlyClient, {
      connectionSummary: /Synchronized|Reconnect in progress/,
      networkStatus: "Online",
      role: "Viewer access",
      state: /Connected|Disconnected|Reconnecting\.\.\./,
    })
    await closeSettingsOverlay(page)

    await expect(readonlyClient).not.toHaveURL(/\/control\//)
    await expectReadonlyTimerControls(readonlyClient)
    await expect(readonlyClient.locator("body")).toMatchAriaSnapshot({
      name: "remote-readonly-client-screen.aria.yml",
    })
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
  const { readonlyClientUrl } = await enableLiveSessionWithClientUrls(page)
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
  await expect(qrCodeDialog).toMatchAriaSnapshot({
    name: "remote-readonly-share-qr-dialog.aria.yml",
  })
  const qrCodeBounds = await qrCodeDialog.boundingBox()
  const qrViewport = readonlyClient.viewportSize()

  expect(qrCodeBounds?.width).toBe(qrViewport?.width)
  expect(qrCodeBounds?.height).toBe(qrViewport?.height)
  await qrCodeDialog.click()
  await expect(qrCodeDialog).not.toBeVisible()

  await readonlyClient
    .getByRole("button", { name: /^Open session status\./ })
    .click()
  const offcanvas = readonlyClient.getByTestId("sidebar-offcanvas")
  await expect(readonlyClient.getByTestId("sidebar-panel-status")).toBeVisible()
  await expect(
    readonlyClient.getByTestId("sidebar-panel-status"),
  ).toMatchAriaSnapshot({
    name: "remote-readonly-status-panel.aria.yml",
  })
  const offcanvasBounds = await offcanvas.boundingBox()
  const statusViewport = readonlyClient.viewportSize()

  expect(offcanvasBounds?.width).toBe(statusViewport?.width)
  expect(offcanvasBounds?.height).toBe(statusViewport?.height)
})

test("viewer clients warn when the last controller leaves", async ({
  page,
}) => {
  const { controlClientUrl, readonlyClientUrl } =
    await enableLiveSessionWithClientUrls(page)
  const controlClient = await openClientFromSettings(page, controlClientUrl)
  const readonlyClient = await openClientFromSettings(
    page,
    readonlyClientUrl,
    "Viewer link",
  )

  await closeSettingsOverlay(page)
  await waitForRemoteCluster([page, controlClient, readonlyClient], {
    clientCount: 2,
    mainConnectionCount: 2,
    message: "remote cluster should stabilize before the controller leaves",
  })

  await page.close()
  await controlClient.close()

  await expectLiveSessionStatus(readonlyClient, {
    connectionSummary: /Waiting for controller|Reconnect in progress/,
    networkStatus: "Online",
    role: "Viewer access",
    state: /Waiting|Reconnecting\.\.\./,
  })
  await expect(readonlyClient).toHaveURL(/\/view\//)
  await expectReadonlyTimerControls(readonlyClient)
})

test("syncs mixed readonly and control clients", async ({ page }) => {
  const { controlClientUrl, readonlyClientUrl } =
    await enableLiveSessionWithClientUrls(page)
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

  await expectLiveSessionStatus(page, {
    connectionSummary: "Synchronized",
    networkStatus: "Online",
    role: "Control access",
    state: "Connected",
  })
  await expectLiveSessionStatus(controlClients[0], {
    connectionSummary: "Synchronized",
    networkStatus: "Online",
    role: "Control access",
    state: "Connected",
  })
  await expectLiveSessionStatus(readonlyClients[0], {
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

test("summarizes participants relative to the current client and labels the raw participant list", async ({
  page,
}) => {
  const { controlClientUrl, readonlyClientUrl } =
    await enableLiveSessionWithClientUrls(page)
  const controlClient = await openClientFromSettings(page, controlClientUrl)
  const readonlyClient = await openClientFromSettings(
    page,
    readonlyClientUrl,
    "Viewer link",
  )

  await closeSettingsOverlay(page)
  await waitForRemoteCluster([page, controlClient, readonlyClient], {
    clientCount: 2,
    mainConnectionCount: 2,
    message: "participant summaries should wait for the cluster to connect",
  })

  await expectLiveSessionStatus(page, {
    connectionSummary: "Synchronized",
    networkStatus: "Online",
    participantSummary: "You + 1 control + 1 view",
    role: "Control access",
    state: "Connected",
  })
  await expectLiveSessionStatus(controlClient, {
    connectionSummary: "Synchronized",
    networkStatus: "Online",
    participantSummary: "You + 1 control + 1 view",
    role: "Control access",
    state: "Connected",
  })
  await expectLiveSessionStatus(readonlyClient, {
    connectionSummary: "Synchronized",
    networkStatus: "Online",
    participantSummary: "You + 2 control",
    role: "Viewer access",
    state: "Connected",
  })

  await expectParticipantLabels(page, ["You", "Control", "View"])
  await expectParticipantLabels(controlClient, ["Control", "You", "View"])
  await expectParticipantLabels(readonlyClient, ["Control", "Control", "You"])

  await readonlyClient.close()

  await expectLiveSessionStatus(page, {
    connectionSummary: "Synchronized",
    networkStatus: "Online",
    participantSummary: "You + 1 control",
    role: "Control access",
    state: "Connected",
  })
  await expectLiveSessionStatus(controlClient, {
    connectionSummary: "Synchronized",
    networkStatus: "Online",
    participantSummary: "You + 1 control",
    role: "Control access",
    state: "Connected",
  })

  const rejoinedViewer = await page.context().newPage()
  await rejoinedViewer.goto(readonlyClientUrl)
  await expectReadonlyPlaceholder(rejoinedViewer)
  await waitForRemoteCluster([page, controlClient, rejoinedViewer], {
    clientCount: 2,
    mainConnectionCount: 2,
    message: "participant summaries should update after viewer reconnect",
  })
  await expectLiveSessionStatus(rejoinedViewer, {
    connectionSummary: "Synchronized",
    networkStatus: "Online",
    participantSummary: "You + 2 control",
    role: "Viewer access",
    state: "Connected",
  })
})

test("keeps long wrapped titles readable in readonly remote clients", async ({
  page,
}) => {
  const { readonlyClientUrl } = await enableLiveSessionWithClientUrls(page)
  const readonlyClient = await openClientFromSettings(
    page,
    readonlyClientUrl,
    "Viewer link",
  )

  await closeSettingsOverlay(page)
  await waitForRemoteCluster([page, readonlyClient], {
    clientCount: 1,
    mainConnectionCount: 1,
    message: "readonly client should connect before wrapped title sync",
  })

  const longTitle = "Quarterly planning retrospective and facilitator notes"

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
    const { readonlyClientUrl } = await enableLiveSessionWithClientUrls(page)
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
  test.slow()

  const { controlClientUrl } = await enableLiveSessionWithClientUrls(page)
  const controlClient = await openClientFromSettings(page, controlClientUrl)

  await closeSettingsOverlay(page)
  await expectLiveSessionStatus(controlClient, {
    connectionSummary: /Synchronized|Reconnect in progress/,
    networkStatus: "Online",
    role: "Control access",
    state: /Connected|Disconnected|Reconnecting\.\.\./,
    timeoutMs: 20_000,
  })
  await expect(
    controlClient.getByRole("button", { name: "START" }),
  ).toBeVisible()

  try {
    await controlClient.context().setOffline(true)

    await expectLiveSessionStatus(controlClient, {
      connectionSummary:
        /Reconnect in progress|Restoring synchronization|Synchronized/,
      networkStatus: "Offline",
      role: "Control access",
      state: /Connected|Disconnected|Reconnecting\.\.\./,
      timeoutMs: 10_000,
    })
    await expect(
      controlClient.getByRole("button", { name: /^Open session status\./ }),
    ).not.toContainText("Error")
    await expect(controlClient.getByTestId("remote-status-error")).toHaveCount(
      0,
    )
    await expect(
      controlClient.getByRole("button", { name: "Use local mode" }),
    ).toHaveCount(0)
    await expect(
      controlClient.getByRole("button", { name: "Retry connection" }),
    ).toHaveCount(0)

    await controlClient.waitForTimeout(20_000)

    await expectLiveSessionStatus(controlClient, {
      connectionSummary:
        /Reconnect in progress|Restoring synchronization|Synchronized/,
      networkStatus: "Offline",
      role: "Control access",
      state: /Connected|Disconnected|Reconnecting\.\.\./,
      timeoutMs: 10_000,
    })
    await expect(
      controlClient.getByRole("button", { name: "Use local mode" }),
    ).toHaveCount(0)
    await expect(
      controlClient.getByRole("button", { name: "Retry connection" }),
    ).toHaveCount(0)
  } finally {
    await controlClient.context().setOffline(false)
  }
})

test("keeps the live session action visible after an offline start", async ({
  page,
}) => {
  test.slow()

  await openTimer(page, 3)
  await openSidebarPanel(page, "Share")
  await page.context().setOffline(true)
  await expect
    .poll(() =>
      page
        .evaluate(() => {
          const button = Array.from(
            document.querySelectorAll(
              '[data-testid="sidebar-panel-share"] button',
            ),
          ).find((node) => node.textContent?.trim() === "Start live session")

          if (!(button instanceof HTMLButtonElement)) {
            return false
          }

          const box = button.getBoundingClientRect()

          return (
            box.width > 0 &&
            box.height > 0 &&
            box.top >= 0 &&
            box.left >= 0 &&
            box.bottom <= window.innerHeight &&
            box.right <= window.innerWidth
          )
        })
        .catch(() => false),
    )
    .toBe(true)

  await page.evaluate(() => {
    const button = Array.from(
      document.querySelectorAll('[data-testid="sidebar-panel-share"] button'),
    ).find((node) => node.textContent?.trim() === "Start live session")

    if (!(button instanceof HTMLButtonElement)) {
      throw new Error("Start live session button is unavailable")
    }

    button.click()
  })
  await expect
    .poll(
      () =>
        page
          .evaluate(() => {
            const labels = new Set(
              Array.from(document.querySelectorAll("button"))
                .map((node) => node.textContent?.trim() ?? "")
                .filter(Boolean),
            )

            return [
              "START",
              "Start live session",
              "Starting live session...",
              "Retry now",
              "Retry connection",
              "Use local mode",
              "End live session",
            ].some((label) => labels.has(label))
          })
          .catch(() => false),
      { timeout: 20_000 },
    )
    .toBe(true)

  const useLocalModeButton = page.getByRole("button", {
    name: "Use local mode",
  })
  if (await useLocalModeButton.isVisible().catch(() => false)) {
    await expect(
      page.getByRole("button", { name: "Send Debug Info" }),
    ).toBeVisible()
    await useLocalModeButton.click()
    await expect(page).toHaveURL(/\/(\?|$)/)
    await expect(useLocalModeButton).toHaveCount(0)
    await expect(
      page.getByRole("button", { name: "Retry connection" }),
    ).toHaveCount(0)
    await expect(
      page.getByRole("button", { name: "Start live session" }),
    ).toBeVisible()
  }

  await page.context().setOffline(false)
})

test("shows a recoverable error for malformed viewer links", async ({
  page,
}) => {
  await page.goto("/view")

  await expect(page.locator("body")).toMatchAriaSnapshot({
    name: "remote-malformed-viewer-link-screen.aria.yml",
  })
  await expectLiveSessionStatus(page, {
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
    await enableLiveSessionWithClientUrls(page)

  await expect
    .poll(() => page.evaluate(() => window.location.pathname))
    .toMatch(/^\/control\/.+/)
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
  await expectLiveSessionStatus(controlClient, {
    connectionSummary: "Synchronized",
    networkStatus: "Online",
    role: "Control access",
    state: "Connected",
  })
  await expectLiveSessionStatus(readonlyClient, {
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
    const { readonlyClientUrl } = await enableLiveSessionWithClientUrls(page)

    await openSidebarPanel(page, "Share")
    await page.getByRole("button", { name: "End live session" }).click()
    await expect(
      page.getByRole("button", { name: "Start live session" }),
    ).toBeVisible()
    await page.waitForTimeout(250)

    const expiredViewerPage = await page.context().newPage()
    await expiredViewerPage.goto(readonlyClientUrl)
    await expect(expiredViewerPage.locator("body")).toMatchAriaSnapshot({
      name: "remote-expired-viewer-link-screen.aria.yml",
    })

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
