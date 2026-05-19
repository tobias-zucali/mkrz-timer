import { expect, Page } from "@playwright/test"
import { hexToRgbChannels } from "../../src/utils/colors"

function buildTimerPath({
  backgroundColor = "000000",
  foregroundColor = "ffffff",
  primaryColor = "d61f69",
  seconds,
  title = "",
}: {
  backgroundColor?: string
  foregroundColor?: string
  primaryColor?: string
  seconds: number
  title?: string
}) {
  return `/?v=1&t=${seconds}!${primaryColor}!${encodeURIComponent(title)}!0&bg=${backgroundColor}&fg=${foregroundColor}`
}

const timerUrl = buildTimerPath({ seconds: 60 })
export const relayUrl =
  process.env.PLAYWRIGHT_RELAY_URL || "http://127.0.0.1:9100"
export const relayRoutePattern = `${relayUrl}/ws`
export const peerServerRoutePattern = `${relayUrl}/**`

type RemoteDebugState = {
  connectionCount: string
  remoteState: string
  role: string
  sessionId: string
}

type TimerSettings = {
  backgroundColor?: string
  foregroundColor?: string
  minutes?: string
  primaryColor?: string
  seconds?: string
  title?: string
}

export type RemoteClientUrls = {
  controlClientUrl: string
  readonlyClientUrl: string
}

type ScreenshotMaskOptions = {
  fullPage?: boolean
  message?: string
  name: string
}

type SidebarPanelName = "Settings" | "Share" | "Status" | "Timer"

const DEBUG_INFO_SELECTORS = [
  "nextjs-portal",
  '[data-nextjs-dev-overlay="true"]',
]

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

async function setDocumentSentinel(page: Page) {
  return page.evaluate(() => {
    const sentinel = `sentinel-${Math.random().toString(36).slice(2)}`
    ;(
      window as typeof window & { __playwrightDocumentSentinel?: string }
    ).__playwrightDocumentSentinel = sentinel
    return sentinel
  })
}

async function expectDocumentSentinel(page: Page, expectedSentinel: string) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __playwrightDocumentSentinel?: string })
            .__playwrightDocumentSentinel ?? null,
      ),
    )
    .toBe(expectedSentinel)
}

export async function openTimer(page: Page, seconds = 3, baseUrl?: string) {
  const path = buildTimerPath({ seconds })
  await page.goto(baseUrl ? new URL(path, baseUrl).toString() : path)
}

export async function expectScreenshotWithoutDebugInfo(
  page: Page,
  { fullPage = false, message, name }: ScreenshotMaskOptions,
) {
  const styleTag = await page.addStyleTag({
    content: `${DEBUG_INFO_SELECTORS.join(", ")} { display: none !important; }`,
  })

  try {
    await expect(page, message).toHaveScreenshot(name, {
      fullPage,
      maxDiffPixelRatio: 0.01,
    })
  } finally {
    await styleTag.evaluate((node) => {
      node.parentNode?.removeChild(node)
    })
  }
}

export async function enableRemoteMode(page: Page) {
  await page.goto(timerUrl)

  await openSidebarPanel(page, "Share")
  await expect(
    page.getByRole("button", { name: "Start live session" }),
  ).toBeVisible()
  const documentSentinel = await setDocumentSentinel(page)
  await page.getByRole("button", { name: "Start live session" }).click()
  await expectDocumentSentinel(page, documentSentinel)

  const readonlyClientUrlInput = page.getByRole("textbox", {
    name: "Viewer link",
  })
  const controlClientUrlInput = page.getByRole("textbox", {
    name: "Control link",
  })
  await expect(readonlyClientUrlInput).toBeVisible({ timeout: 30_000 })
  await expect(controlClientUrlInput).toBeVisible()
  await expect
    .poll(() => readonlyClientUrlInput.inputValue(), {
      message: "viewer URL should include a readonly token path",
    })
    .toContain("/view/")

  const readonlyClientUrl = await readonlyClientUrlInput.inputValue()

  expect(readonlyClientUrl).not.toContain("/control/")
  await expect
    .poll(() => controlClientUrlInput.inputValue(), {
      message: "control client URL should include the control token path",
    })
    .toContain("/control/")

  return controlClientUrlInput.inputValue()
}

export async function enableRemoteModeWithClientUrls(
  page: Page,
): Promise<RemoteClientUrls> {
  const controlClientUrl = await enableRemoteMode(page)
  const readonlyClientUrl = await page
    .getByRole("textbox", { name: "Viewer link" })
    .inputValue()

  return {
    controlClientUrl,
    readonlyClientUrl,
  }
}

export async function openClientFromSettings(
  page: Page,
  clientUrl: string,
  label = "Control link",
) {
  const expectedUrl = new URL(clientUrl)
  const clientPagePromise = page.waitForEvent("popup")
  await openSidebarPanel(page, "Share")
  await page
    .getByRole("textbox", { name: label })
    .locator("..")
    .getByRole("link", { name: "Open URL" })
    .click()
  const clientPage = await clientPagePromise

  await expect(clientPage).toHaveURL(expectedUrl.toString())

  return clientPage
}

export async function openClientsFromSettings(
  page: Page,
  clientUrl: string,
  count: number,
  label = "Control link",
) {
  const clients: Page[] = []

  for (let index = 0; index < count; index += 1) {
    clients.push(await openClientFromSettings(page, clientUrl, label))
  }

  return clients
}

export async function closeSettingsOverlay(page: Page) {
  const closeButton = page.locator(
    '[data-testid^="sidebar-panel-"] button[title="Close sidebar"]',
  )

  if ((await closeButton.count()) === 0) {
    return
  }

  await closeButton.click()
  await expect(closeButton).toHaveCount(0)
}

export async function expectUrlQrCode(page: Page, label: string) {
  if (
    label === "Local link" ||
    label === "Viewer link" ||
    label === "Control link"
  ) {
    await openSidebarPanel(page, "Share")
  }
  await page.getByRole("button", { name: `Show ${label}` }).click()
  const baseLabel = label.endsWith("Client URL")
    ? label.replace(/\s+URL$/, "")
    : `${label}`
  const heading = `Timer · ${baseLabel}`
  const qrCodeDialog = page.getByRole("dialog", { name: heading })

  await expect(qrCodeDialog).toBeVisible()
  await expect(
    qrCodeDialog.getByRole("img", { name: `${label}` }),
  ).toBeVisible()

  await qrCodeDialog.click()
  await expect(qrCodeDialog).not.toBeVisible()
}

export async function openSidebarPanel(
  page: Page,
  panelName: SidebarPanelName,
) {
  const sidebar = page.getByTestId("sidebar-offcanvas")
  const panelTestId = `sidebar-panel-${panelName.toLowerCase()}`

  if (
    await page
      .getByTestId(panelTestId)
      .isVisible()
      .catch(() => false)
  ) {
    return
  }

  if (panelName === "Share") {
    if (!(await sidebar.isVisible().catch(() => false))) {
      await page
        .getByRole("button", { name: "Open sharing" })
        .evaluate((element) => {
          ;(element as HTMLButtonElement).click()
        })
    }

    const didOpenViaShareButton = await page
      .getByTestId(panelTestId)
      .isVisible()
      .catch(() => false)

    if (!didOpenViaShareButton) {
      if (!(await sidebar.isVisible().catch(() => false))) {
        await page.getByRole("button", { name: "Toggle navigation" }).click()
        await expect(sidebar).toBeVisible()
      }

      await sidebar
        .getByRole("button", { exact: true, name: "Share" })
        .evaluate((element) => {
          ;(element as HTMLButtonElement).click()
        })
    }

    await expect(page.getByTestId(panelTestId)).toBeVisible()
    return
  }

  if (!(await sidebar.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Toggle navigation" }).click()
    await expect(sidebar).toBeVisible()
  }

  await sidebar
    .getByRole("button", { exact: true, name: panelName })
    .evaluate((element) => {
      ;(element as HTMLButtonElement).click()
    })
  await expect(page.getByTestId(panelTestId)).toBeVisible()
}

export async function openSettingsOverlay(page: Page) {
  await openSidebarPanel(page, "Timer")
  await expect(
    page.getByTestId("sidebar-panel-timer").getByLabel("Title"),
  ).toBeVisible()
}

export async function updateTimerSettings(
  page: Page,
  {
    backgroundColor,
    foregroundColor,
    minutes,
    primaryColor,
    seconds,
    title,
  }: TimerSettings,
) {
  if (title !== undefined) {
    await openSidebarPanel(page, "Timer")
    await page
      .getByTestId("sidebar-panel-timer")
      .getByLabel("Title")
      .fill(title)
  }
  if (minutes !== undefined) {
    await openSidebarPanel(page, "Timer")
    await page
      .getByTestId("sidebar-panel-timer")
      .getByLabel("Minutes")
      .fill(minutes)
  }
  if (seconds !== undefined) {
    await openSidebarPanel(page, "Timer")
    await page
      .getByTestId("sidebar-panel-timer")
      .getByLabel("Seconds")
      .fill(seconds)
  }
  if (backgroundColor !== undefined) {
    await openSidebarPanel(page, "Settings")
    await page
      .getByTestId("sidebar-panel-settings")
      .getByLabel("Background")
      .fill(backgroundColor)
  }
  if (foregroundColor !== undefined) {
    await openSidebarPanel(page, "Settings")
    await page
      .getByTestId("sidebar-panel-settings")
      .getByLabel("Foreground")
      .fill(foregroundColor)
  }
  if (primaryColor !== undefined) {
    await openSidebarPanel(page, "Timer")
    await page
      .getByTestId("sidebar-panel-timer")
      .getByLabel("Primary Color")
      .fill(primaryColor)
  }
}

export async function expectTimerRunning(page: Page) {
  await expect(page.getByRole("button", { name: "PAUSE" })).toBeVisible({
    timeout: 15_000,
  })

  await expectTimerDisplayRunning(page)
}

export async function readTimerTitleValue(page: Page) {
  const timerTitle = page.getByTestId("timer-title")
  const editor = timerTitle.getByTestId("timer-title-input")
  const display = timerTitle.getByTestId("timer-title-text")
  const emptyAction = timerTitle.getByTestId("timer-title-empty-action")

  if ((await editor.count()) > 0) {
    return editor.inputValue()
  }

  if ((await display.count()) > 0) {
    return ((await display.textContent()) ?? "")
      .replace(/\r\n/g, "\n")
      .replace(/\u00a0/g, " ")
  }

  if ((await emptyAction.count()) > 0) {
    return ""
  }

  return ((await timerTitle.textContent()) ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
}

export async function expectTimerTitleValue(page: Page, value: string) {
  await expect
    .poll(() => readTimerTitleValue(page), {
      message: "timer title should match the expected value",
    })
    .toBe(value)
}

export async function expectTimerDisplayRunning(page: Page) {
  const initialSeconds = await getDisplayedSeconds(page)
  await expect
    .poll(() => getDisplayedSeconds(page), {
      message: "timer should count down while running",
      timeout: 5_000,
    })
    .toBeLessThan(initialSeconds)
}

export async function expectReadonlyTimerControls(page: Page) {
  const timerDisplay = page.getByTestId("timer-display")
  await expect(page.getByRole("button", { name: "START" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "PAUSE" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "RESET" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Settings" })).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "Toggle navigation" }),
  ).toHaveCount(0)
  await expect(timerDisplay.getByLabel("Minutes")).toHaveAttribute(
    "readonly",
    "",
  )
  await expect(timerDisplay.getByLabel("Seconds")).toHaveAttribute(
    "readonly",
    "",
  )
}

export async function expectRemoteStatus(
  page: Page,
  {
    activityLogIncludes,
    connectionSummary,
    description,
    errorText,
    networkStatus,
    peerServerReachability,
    relayReachability,
    role,
    showSendToDeveloperButton,
    state,
  }: {
    activityLogIncludes?: RegExp | string
    connectionSummary: RegExp | string
    description?: RegExp | string
    errorText?: RegExp | string
    networkStatus?: RegExp | string
    peerServerReachability?: RegExp | string
    relayReachability?: RegExp | string
    role: RegExp | string
    showSendToDeveloperButton?: boolean
    state: RegExp | string
  },
) {
  const remoteStatus = page.getByTestId("remote-status")
  const panel = page.getByTestId("remote-status-panel")
  const detailsToggle = page.getByTestId("remote-status-details-toggle")
  const activityToggle = page.getByTestId("remote-status-activity-toggle")
  const getFieldText = async (testId: string) =>
    ((await panel.getByTestId(testId).textContent()) ?? "")
      .replace(/\s+/g, " ")
      .trim()
  const matches = (actual: string, expected: RegExp | string) =>
    expected instanceof RegExp ? expected.test(actual) : actual === expected
  const expectFieldText = async (
    testId: string,
    expected: RegExp | string,
    message: string,
  ) => {
    await expect
      .poll(async () => matches(await getFieldText(testId), expected), {
        message,
      })
      .toBe(true)
  }
  const getOptionalText = async (testId: string) =>
    (
      (await panel
        .getByTestId(testId)
        .textContent()
        .catch(() => "")) ?? ""
    )
      .replace(/\s+/g, " ")
      .trim()

  await expect(remoteStatus).toHaveCount(1, { timeout: 15_000 })
  await expect(remoteStatus).toHaveAttribute("role", "status", {
    timeout: 15_000,
  })
  await expect
    .poll(
      async () => {
        if (await panel.isVisible()) {
          return true
        }

        if (
          (await page
            .getByRole("button", { name: "Toggle navigation" })
            .count()) === 0
        ) {
          await remoteStatus.getByTestId("remote-status-toggle").click({
            force: true,
          })
        } else {
          await openSidebarPanel(page, "Status")
        }
        return panel.isVisible().catch(() => false)
      },
      {
        message: "status panel should pin open before reading its contents",
      },
    )
    .toBe(true)

  await expect(panel).toBeVisible()
  await expect(panel.getByRole("heading", { name: "Status" })).toBeVisible()
  if (showSendToDeveloperButton) {
    await expect(
      panel.getByRole("button", { name: "Send to developer" }),
    ).toBeVisible()
  }

  await expectFieldText(
    "remote-status-role",
    role,
    "status panel should show the expected role",
  )
  await expectFieldText(
    "remote-status-state",
    state,
    "status panel should show the expected state",
  )
  await expectFieldText(
    "remote-status-link",
    connectionSummary,
    "status panel should show the expected live session summary",
  )

  if (networkStatus !== undefined) {
    if ((await detailsToggle.count()) > 0) {
      if ((await detailsToggle.getAttribute("aria-expanded")) !== "true") {
        await detailsToggle.click()
      }
    }
    await expectFieldText(
      "remote-status-network",
      networkStatus,
      "status panel should show the expected network status",
    )
  }

  const expectedRelayReachability = relayReachability ?? peerServerReachability

  if (expectedRelayReachability !== undefined) {
    if ((await detailsToggle.count()) > 0) {
      if ((await detailsToggle.getAttribute("aria-expanded")) !== "true") {
        await detailsToggle.click()
      }
    }
    await expectFieldText(
      "remote-status-relay-reachability",
      expectedRelayReachability,
      "status panel should show the expected relay reachability",
    )
  }

  if (description !== undefined) {
    await expectFieldText(
      "remote-status-description",
      description,
      "status panel should show the expected description",
    )
  }

  if (errorText !== undefined) {
    await expect
      .poll(
        async () =>
          matches(await getOptionalText("remote-status-error"), errorText),
        {
          message: "status panel should show the expected error text",
        },
      )
      .toBe(true)
  }

  if (activityLogIncludes !== undefined) {
    if ((await activityToggle.count()) > 0) {
      if ((await activityToggle.getAttribute("aria-expanded")) !== "true") {
        await activityToggle.click()
      }
    }
    await expect
      .poll(
        async () =>
          matches(
            await getOptionalText("remote-status-activity-log"),
            activityLogIncludes,
          ),
        {
          message: "status panel should show the expected activity log details",
        },
      )
      .toBe(true)
  }

  if (await panel.isVisible()) {
    await page
      .locator('[data-testid^="sidebar-panel-"] button[title="Close sidebar"]')
      .first()
      .click()
    await expect(panel).not.toBeVisible()
  }
}

export async function expectReadonlyPlaceholder(page: Page) {
  const placeholder = page.getByTestId("readonly-timer-placeholder")
  const timerDisplay = page.getByTestId("timer-display")

  await expect
    .poll(
      async () =>
        (await placeholder.isVisible().catch(() => false)) ||
        (await timerDisplay.isVisible().catch(() => false)),
      {
        message:
          "readonly client should either wait for sync with a placeholder or already show the readonly timer",
        timeout: 5_000,
      },
    )
    .toBe(true)

  if (await placeholder.isVisible().catch(() => false)) {
    return
  }

  await expect(timerDisplay).toBeVisible()
  await expectReadonlyTimerControls(page)
}

export async function expectTimerPaused(page: Page) {
  await expect(page.getByRole("button", { name: "START" })).toBeVisible({
    timeout: 15_000,
  })
}

export async function getTimerControlState(page: Page) {
  if (await page.getByRole("button", { name: "PAUSE" }).isVisible()) {
    return "running"
  }
  if (await page.getByRole("button", { name: "START" }).isVisible()) {
    return "paused"
  }
  return "unknown"
}

export async function expectTimerControlsToMatch(pages: Page[]) {
  let matchingState = "unknown"

  await expect
    .poll(
      async () => {
        const states = await Promise.all(pages.map(getTimerControlState))
        const [firstState] = states
        const allMatch = states.every((state) => state === firstState)

        matchingState = allMatch ? firstState : "unknown"
        return allMatch ? firstState : "mixed"
      },
      {
        message: "all timer controls should converge to the same state",
        timeout: 15_000,
      },
    )
    .not.toBe("mixed")

  return matchingState
}

export async function getDisplayedSeconds(page: Page) {
  const timerDisplay = page.getByTestId("timer-display")
  const minutes = Number(await timerDisplay.getByLabel("Minutes").inputValue())
  const seconds = Number(await timerDisplay.getByLabel("Seconds").inputValue())

  return minutes * 60 + seconds
}

async function getBodyCssVariable(page: Page, name: string) {
  return page.locator("body").evaluate((body, cssVariableName) => {
    return getComputedStyle(body).getPropertyValue(cssVariableName).trim()
  }, name)
}

export async function expectTimerSettings(page: Page, settings: TimerSettings) {
  if (settings.title !== undefined) {
    const expectedTitle = settings.title
    await expect
      .poll(() => readTimerTitleValue(page), {
        message: "timer title should reflect synced settings",
      })
      .toBe(expectedTitle)
  }

  if (settings.minutes !== undefined || settings.seconds !== undefined) {
    const expectedSeconds =
      Number(settings.minutes ?? "0") * 60 + Number(settings.seconds ?? "0")

    await expect
      .poll(() => getDisplayedSeconds(page), {
        message: "timer display should reflect settings duration",
      })
      .toBe(expectedSeconds)
  }

  if (settings.backgroundColor !== undefined) {
    await expect
      .poll(() => getBodyCssVariable(page, "--background"), {
        message: "background color should be applied",
      })
      .toBe(hexToRgbChannels(settings.backgroundColor))
  }
  if (settings.foregroundColor !== undefined) {
    await expect
      .poll(() => getBodyCssVariable(page, "--foreground"), {
        message: "foreground color should be applied",
      })
      .toBe(hexToRgbChannels(settings.foregroundColor))
  }
  if (settings.primaryColor !== undefined) {
    await expect
      .poll(() => getBodyCssVariable(page, "--primary"), {
        message: "primary color should be applied",
      })
      .toBe(hexToRgbChannels(settings.primaryColor))
  }
}

export async function expectTimerUrlParams(
  page: Page,
  settings: TimerSettings,
) {
  await expect
    .poll(() => page.url(), {
      message: "timer URL should reflect settings without color hashes",
    })
    .toEqual(expect.not.stringContaining("%23"))

  await expect
    .poll(() => page.url(), {
      message: "timer URL should not contain a URL fragment",
    })
    .toEqual(expect.not.stringContaining("#"))

  if (settings.backgroundColor !== undefined) {
    await expect(page).toHaveURL(
      new RegExp(`(?:\\?|&)bg=${settings.backgroundColor.slice(1)}(?:&|$)`),
    )
  }
  if (settings.foregroundColor !== undefined) {
    await expect(page).toHaveURL(
      new RegExp(`(?:\\?|&)fg=${settings.foregroundColor.slice(1)}(?:&|$)`),
    )
  }
  if (settings.primaryColor !== undefined) {
    await expect(page).toHaveURL(
      new RegExp(
        `(?:\\?|&)t=[^&]*%21${escapeRegex(settings.primaryColor.slice(1))}%21[^&]*(?:&|$)`,
      ),
    )
  }

  if (
    settings.minutes !== undefined ||
    settings.seconds !== undefined ||
    settings.title !== undefined
  ) {
    const totalSeconds =
      Number(settings.minutes ?? "0") * 60 + Number(settings.seconds ?? "0")
    const encodedTitle = encodeURIComponent(
      encodeURIComponent(settings.title ?? ""),
    )
    await expect(page).toHaveURL(
      new RegExp(
        `(?:\\?|&)t=${totalSeconds}%21.*%21${escapeRegex(encodedTitle)}%210(?:&|$)`,
      ),
    )
  }
}

export async function expectRemoteSessionOnlyUrl(
  page: Page,
  { control = false }: { control?: boolean } = {},
) {
  await expect(page).toHaveURL(control ? /\/control\// : /\/view\//)

  await expect
    .poll(() => page.url(), {
      message: "remote client URLs should stay focused on session params",
    })
    .not.toMatch(/(?:\?|&)(?:bg|fg|pid|t|v)=/)
}

export async function expectControlClientUrlParams(
  page: Page,
  settings: TimerSettings,
) {
  if (page.url().includes("/control/")) {
    await expectRemoteSessionOnlyUrl(page, { control: true })
    await expectTimerSettings(page, settings)
    return
  }

  await expectTimerUrlParams(page, settings)
}

export async function expectTimersToMatch(
  pages: Page[],
  expectedSeconds?: number,
  tolerance = expectedSeconds === undefined ? 1 : 0,
) {
  const secondsByPage = await Promise.all(pages.map(getDisplayedSeconds))
  const firstValue = expectedSeconds ?? secondsByPage[0]

  for (const seconds of secondsByPage) {
    expect(Math.abs(seconds - firstValue)).toBeLessThanOrEqual(tolerance)
  }
}

export async function getPeerDebugState(page: Page): Promise<RemoteDebugState> {
  const debugState = page.getByTestId("remote-status")

  return {
    connectionCount:
      (await debugState.getAttribute("data-connection-count")) ?? "",
    remoteState: (await debugState.getAttribute("data-remote-state")) ?? "",
    role: (await debugState.getAttribute("data-remote-role")) ?? "",
    sessionId: (await debugState.getAttribute("data-session-id")) ?? "",
  }
}

export async function expectNoStaleConnectedClient(page: Page) {
  await expect
    .poll(
      async () => {
        const state = await getPeerDebugState(page)
        return {
          connectionCount: state.connectionCount,
          remoteState: state.remoteState,
          sessionId: state.sessionId,
        }
      },
      {
        message:
          "joined clients should not stay marked connected without a relay session",
        timeout: 10_000,
      },
    )
    .not.toEqual({
      connectionCount: "0",
      remoteState: "liveConnected",
      sessionId: "",
    })
}

export async function waitForRemoteCluster(
  pages: Page[],
  {
    clientCount,
    mainConnectionCount,
    message = "remote cluster should stabilize",
    timeout = 45_000,
  }: {
    clientCount: number
    mainConnectionCount: number
    message?: string
    timeout?: number
  },
) {
  void mainConnectionCount

  await expect
    .poll(
      async () => {
        const states = await Promise.all(pages.map(getPeerDebugState))

        return {
          connectedPages: states.filter(
            ({ remoteState, sessionId }) =>
              sessionId.length > 0 &&
              remoteState !== "local" &&
              remoteState !== "liveEnded",
          ).length,
        }
      },
      {
        timeout,
        message,
      },
    )
    .toEqual({
      connectedPages: clientCount + 1,
    })
}
