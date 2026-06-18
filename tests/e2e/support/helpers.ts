import { expect, Page } from "@playwright/test"

function buildTimerPath({
  primaryColor = "d61f69",
  seconds,
  theme,
  title = "",
}: {
  primaryColor?: string
  seconds: number
  theme?: "dark" | "bright"
  title?: string
}) {
  const themeParam = theme && theme !== "dark" ? `&theme=${theme}` : ""
  return `/en/t?v=1&t=${seconds}!${primaryColor}!${encodeURIComponent(title)}!1!0&a=0${themeParam}`
}

const timerUrl = buildTimerPath({ seconds: 60 })
export const relayUrl =
  process.env.PLAYWRIGHT_RELAY_URL || "http://127.0.0.1:9200"
export const relayRoutePattern = `${relayUrl}/ws`
export const peerServerRoutePattern = `${relayUrl}/**`

type RemoteDebugState = {
  connectionCount: string
  remoteState: string
  role: string
  sessionId: string
}

type TimerSettings = {
  theme?: "dark" | "bright"
  minutes?: string
  primaryColor?: string
  seconds?: string
  soundId?: string
  title?: string
  ttsEnabled?: boolean
}

export type RemoteClientUrls = {
  controlClientUrl: string
  readonlyClientUrl: string
}

type ScreenshotMaskOptions = {
  fullPage?: boolean
  maxDiffPixelRatio?: number
  message?: string
  name: string
}

type SidebarPanelName =
  | "About"
  | "Accessibility"
  | "Contact"
  | "Impressum"
  | "Privacy"
  | "Settings"
  | "Share"
  | "Status"
  | "Terms"
  | "Timer"

const DEBUG_INFO_SELECTORS = [
  "nextjs-portal",
  '[data-nextjs-dev-overlay="true"]',
]

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

function getSessionStatusToggle(page: Page) {
  return page.getByRole("button", { name: /^Open session status\./ })
}

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
  {
    fullPage = false,
    maxDiffPixelRatio = 0.01,
    message,
    name,
  }: ScreenshotMaskOptions,
) {
  const styleTag = await page.addStyleTag({
    content: `${DEBUG_INFO_SELECTORS.join(", ")} { display: none !important; }`,
  })

  try {
    await expect(page, message).toHaveScreenshot(name, {
      fullPage,
      maxDiffPixelRatio,
    })
  } finally {
    await styleTag
      .evaluate((node) => {
        node.parentNode?.removeChild(node)
      })
      .catch(() => {})
  }
}

export async function enableLiveSession(page: Page) {
  await page.goto(timerUrl)

  await openSidebarPanel(page, "Share")
  await expect(
    page.getByRole("button", { name: "Start live session" }),
  ).toBeVisible()
  const documentSentinel = await setDocumentSentinel(page)
  await page.getByRole("button", { name: "Start live session" }).click()
  await expectDocumentSentinel(page, documentSentinel)
  await expectLiveSessionOnlyUrl(page, { control: true })

  const readonlyClientUrlInput = page.getByRole("textbox", {
    name: "Join link",
  })
  const controlClientUrlInput = page.getByRole("textbox", {
    name: "Manage link",
  })
  await expect(readonlyClientUrlInput).toBeVisible({ timeout: 30_000 })
  await expect(controlClientUrlInput).toBeVisible()
  await expect
    .poll(() => readonlyClientUrlInput.inputValue(), {
      message: "viewer URL should include a readonly token path",
    })
    .toContain("/join/")

  const readonlyClientUrl = await readonlyClientUrlInput.inputValue()

  expect(readonlyClientUrl).not.toContain("/manage/")
  await expect
    .poll(() => controlClientUrlInput.inputValue(), {
      message: "control client URL should include the manage token path",
    })
    .toContain("/manage/")

  return controlClientUrlInput.inputValue()
}

export async function enableLiveSessionWithClientUrls(
  page: Page,
): Promise<RemoteClientUrls> {
  const controlClientUrl = await enableLiveSession(page)
  const readonlyClientUrl = await page
    .getByRole("textbox", { name: "Join link" })
    .inputValue()

  return {
    controlClientUrl,
    readonlyClientUrl,
  }
}

export async function openClientFromSettings(
  page: Page,
  clientUrl: string,
  label = "Manage link",
) {
  const expectedUrl = new URL(clientUrl)
  await openSidebarPanel(page, "Share")
  await expect(page.getByRole("textbox", { name: label })).toHaveValue(
    expectedUrl.toString(),
  )
  const clientPage = await page.context().newPage()

  await clientPage.goto(expectedUrl.toString())
  await expect(clientPage).toHaveURL(expectedUrl.toString())
  await expect(getSessionStatusToggle(clientPage)).toHaveCount(1)

  return clientPage
}

export async function openClientsFromSettings(
  page: Page,
  clientUrl: string,
  count: number,
  label = "Manage link",
) {
  const clients: Page[] = []

  for (let index = 0; index < count; index += 1) {
    clients.push(await openClientFromSettings(page, clientUrl, label))
  }

  return clients
}

export async function resolveRecoveryDialogIfPresent(page: Page) {
  const recoveryDialog = page.getByRole("dialog", {
    name: "Live session recovery needs your decision.",
  })

  if (await recoveryDialog.isVisible().catch(() => false)) {
    await recoveryDialog
      .getByRole("button", { name: "Retry connection" })
      .click()
    await expect(recoveryDialog).not.toBeVisible()
  }
}

export async function closeSettingsOverlay(page: Page) {
  await resolveRecoveryDialogIfPresent(page)

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
    label === "Join link" ||
    label === "Manage link"
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
  const navigationToggle = page.getByRole("button", {
    name: "Toggle navigation",
  })
  const isSidebarOpen = async () =>
    (await navigationToggle.getAttribute("aria-expanded")) === "true"

  if (
    await page
      .getByTestId(panelTestId)
      .isVisible()
      .catch(() => false)
  ) {
    return
  }

  if (panelName === "Share") {
    if (!(await isSidebarOpen())) {
      await page.getByRole("button", { name: "Open sharing" }).click()
    }

    const didOpenViaShareButton = await page
      .getByTestId(panelTestId)
      .isVisible()
      .catch(() => false)

    if (!didOpenViaShareButton) {
      if (!(await isSidebarOpen())) {
        await navigationToggle.click()
        await expect(sidebar).toBeVisible()
      }

      await sidebar.getByRole("button", { exact: true, name: "Share" }).click()
    }

    await expect(page.getByTestId(panelTestId)).toBeVisible()
    return
  }

  if (!(await isSidebarOpen())) {
    await navigationToggle.click()
    await expect(sidebar).toBeVisible()
  }

  await sidebar.getByRole("button", { exact: true, name: panelName }).click()
  await expect(page.getByTestId(panelTestId)).toBeVisible()
}

export async function openSettingsOverlay(page: Page) {
  await openSidebarPanel(page, "Timer")
  await expect(
    page.getByTestId("sidebar-panel-timer").getByLabel("Title", { exact: true }),
  ).toBeVisible()
}

export async function updateTimerSettings(
  page: Page,
  {
    theme,
    minutes,
    primaryColor,
    seconds,
    soundId,
    title,
    ttsEnabled,
  }: TimerSettings,
) {
  if (title !== undefined) {
    await openSidebarPanel(page, "Timer")
    await page
      .getByTestId("sidebar-panel-timer")
      .getByLabel("Title", { exact: true })
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
  if (theme !== undefined) {
    await openSidebarPanel(page, "Settings")
    await page
      .getByTestId("sidebar-panel-settings")
      .getByRole("button", { name: theme === "dark" ? "Dark" : "Bright" })
      .click()
  }
  if (ttsEnabled !== undefined) {
    await openSidebarPanel(page, "Settings")
    const checkbox = page
      .getByTestId("sidebar-panel-settings")
      .getByLabel("Voice announcements")
    if ((await checkbox.isChecked()) !== ttsEnabled) {
      await checkbox.click()
    }
  }
  if (soundId !== undefined) {
    await openSidebarPanel(page, "Settings")
    await page
      .getByTestId("sidebar-panel-settings")
      .getByLabel("Sound when finished")
      .selectOption(soundId)
  }
  if (primaryColor !== undefined) {
    await openSidebarPanel(page, "Timer")
    await page
      .getByTestId("sidebar-panel-timer")
      .getByLabel("Color")
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
  const editor = timerTitle.getByLabel("Title", { exact: true })
  const display = timerTitle.getByTestId("timer-title-text")
  const emptyAction = timerTitle.getByRole("button", { name: "Add title" })

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
  await expect(page.getByRole("button", { name: "START" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "PAUSE" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "RESET" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Settings" })).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "Toggle navigation" }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("timer", {
      name: /View only\. Remaining time\./,
    }),
  ).toBeVisible()
  await expect(page.getByRole("spinbutton", { name: "Minutes" })).toHaveCount(0)
  await expect(page.getByRole("spinbutton", { name: "Seconds" })).toHaveCount(0)
}

export async function expectLiveSessionStatus(
  page: Page,
  {
    activityLogIncludes,
    connectionSummary,
    description,
    errorText,
    networkStatus,
    participantSummary,
    peerServerReachability,
    relayReachability,
    role,
    showSendToDeveloperButton,
    state,
    timeoutMs = 10_000,
  }: {
    activityLogIncludes?: RegExp | string
    connectionSummary: RegExp | string
    description?: RegExp | string
    errorText?: RegExp | string
    networkStatus?: RegExp | string
    participantSummary?: RegExp | string
    peerServerReachability?: RegExp | string
    relayReachability?: RegExp | string
    role: RegExp | string
    showSendToDeveloperButton?: boolean
    state: RegExp | string
    timeoutMs?: number
  },
) {
  const remoteStatusToggle = getSessionStatusToggle(page)
  const panel = page.getByTestId("remote-status-panel")
  const detailsToggle = panel.getByRole("button", {
    name: "Connection details",
  })
  const activityToggle = panel.getByRole("button", { name: "Recent activity" })
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
        timeout: timeoutMs,
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

  await expect(remoteStatusToggle).toHaveCount(1, { timeout: 15_000 })
  await expect
    .poll(
      async () => {
        if (await panel.isVisible()) {
          return true
        }

        await remoteStatusToggle.click({ force: true }).catch(() => {})

        if (await panel.isVisible().catch(() => false)) {
          return true
        }

        if (
          (await page
            .getByRole("button", { name: "Toggle navigation" })
            .count()) > 0
        ) {
          await openSidebarPanel(page, "Status").catch(() => {})
        }

        return panel.isVisible().catch(() => false)
      },
      {
        message: "status panel should pin open before reading its contents",
        timeout: Math.max(timeoutMs, 10_000),
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

  if (participantSummary !== undefined) {
    await expectFieldText(
      "remote-status-participant-count",
      participantSummary,
      "status panel should show the expected participant summary",
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
  // data-testid="timer-display" is on the same element in both modes:
  //   readout (running/finished): <output role="timer"> — text spans only, no inputs
  //   editable (ready/paused):    <div role="group">   — labeled minute/second inputs
  // Checking the role directly avoids the fragile input-count heuristic and prevents
  // accidentally reading the pre-start configured duration from the editable inputs.
  const timerDisplay = page.getByTestId("timer-display")
  const isReadout = await timerDisplay.evaluate(
    (el) => el.getAttribute("role") === "timer",
  )

  if (isReadout) {
    const text =
      ((await timerDisplay.textContent()) ?? "").replace(/\s+/g, "") || "00:00"
    const [minutes, seconds] = text.split(":").map(Number)
    return minutes * 60 + seconds
  }

  const minutesInput = timerDisplay.getByLabel("Minutes")
  const secondsInput = timerDisplay.getByLabel("Seconds")
  const minutes = Number(await minutesInput.inputValue())
  const seconds = Number(await secondsInput.inputValue())
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
        timeout: 10_000,
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

  if (settings.theme !== undefined) {
    await expect
      .poll(() => page.locator("body").getAttribute("data-theme"), {
        message: "theme should be applied",
      })
      .toBe(settings.theme)
  }
  if (settings.ttsEnabled !== undefined) {
    await openSidebarPanel(page, "Settings")
    await expect(
      page
        .getByTestId("sidebar-panel-settings")
        .getByLabel("Voice announcements"),
    ).toHaveJSProperty("checked", settings.ttsEnabled)
  }
  if (settings.soundId !== undefined) {
    await openSidebarPanel(page, "Settings")
    await expect(
      page
        .getByTestId("sidebar-panel-settings")
        .getByLabel("Sound when finished"),
    ).toHaveValue(settings.soundId)
  }
  if (settings.primaryColor !== undefined) {
    await expect
      .poll(() => getBodyCssVariable(page, "--color-primary"), {
        message: "primary color should be applied",
      })
      .toBe(settings.primaryColor)
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

  if (settings.theme !== undefined) {
    if (settings.theme === "bright") {
      await expect(page).toHaveURL(/(?:\?|&)theme=bright(?:&|$)/)
    } else {
      await expect(page).not.toHaveURL(/(?:\?|&)theme=(?:&|$)/)
    }
  }
  if (settings.ttsEnabled !== undefined) {
    if (settings.ttsEnabled) {
      await expect(page).toHaveURL(/(?:\?|&)ts=1(?:&|$)/)
    } else {
      await expect(page).not.toHaveURL(/(?:\?|&)ts=1(?:&|$)/)
    }
  }
  if (settings.soundId !== undefined) {
    await expect(page).toHaveURL(
      new RegExp(`(?:\\?|&)s=${escapeRegex(settings.soundId)}(?:&|$)`),
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
        `(?:\\?|&)t=${totalSeconds}%21.*%21${escapeRegex(encodedTitle)}%211%210(?:&|$)`,
      ),
    )
  }
}

export async function expectLiveSessionOnlyUrl(
  page: Page,
  { control = false }: { control?: boolean } = {},
) {
  await expect(page).toHaveURL(control ? /\/manage\// : /\/join\//)

  await expect
    .poll(() => page.url(), {
      message: "remote client URLs should stay focused on session params",
    })
    .not.toMatch(/(?:\?|&)pid=/)
}

export async function expectControlClientUrlParams(
  page: Page,
  settings: TimerSettings,
) {
  if (page.url().includes("/manage/")) {
    await expectLiveSessionOnlyUrl(page, { control: true })
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
  const expectedConnectedPages = clientCount + 1
  const expectedMainConnectionCount = mainConnectionCount + 1

  await expect
    .poll(
      async () => {
        const states = await Promise.all(pages.map(getPeerDebugState))
        const connectedStates = states.filter(
          ({ remoteState, sessionId }) =>
            sessionId.length > 0 &&
            remoteState !== "local" &&
            remoteState !== "liveEnded",
        )
        const sessionIds = connectedStates.map(({ sessionId }) => sessionId)
        const mainConnectionCountValue = Number.parseInt(
          states[0]?.connectionCount ?? "",
          10,
        )

        return {
          connectedPages: connectedStates.length,
          mainConnectionReady:
            Number.isFinite(mainConnectionCountValue) &&
            mainConnectionCountValue >= expectedMainConnectionCount,
          sharedSessionReady:
            sessionIds.length === expectedConnectedPages &&
            new Set(sessionIds).size === 1,
        }
      },
      {
        timeout,
        message,
      },
    )
    .toEqual({
      connectedPages: expectedConnectedPages,
      mainConnectionReady: true,
      sharedSessionReady: true,
    })
}
