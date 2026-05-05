import { expect, Page } from "@playwright/test"
import { hexToRgbChannels } from "../../src/utils/colors"

const timerUrl = "/?m=01&s=00&bg=000000&fg=ffffff&pc=d61f69"

type PeerDebugState = {
  connectionCount: string
  peerId: string
  role: string
  status: string
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

const DEBUG_INFO_SELECTORS = [
  '[data-testid="peer-debug-state"]',
  "nextjs-portal",
  '[data-nextjs-dev-overlay="true"]',
]

export async function openTimer(page: Page, seconds = 3, baseUrl?: string) {
  const path = `/?m=00&s=${seconds.toString().padStart(2, "0")}&bg=000000&fg=ffffff&pc=d61f69`
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
    })
  } finally {
    await styleTag.evaluate((node) => {
      node.parentNode?.removeChild(node)
    })
  }
}

export async function enableRemoteMode(page: Page) {
  await page.goto(timerUrl)

  await openSettingsOverlay(page)
  await expect(page.getByRole("switch", { name: "Remote mode" })).toBeVisible()

  await page.getByRole("switch", { name: "Remote mode" }).click()

  await expect(page.getByRole("switch", { name: "Remote mode" })).toBeChecked()
  await expect(page.getByRole("switch", { name: "Remote mode" })).not.toBeDisabled({ timeout: 15_000 })

  const readonlyClientUrlInput = page.getByRole("textbox", {
    name: "Viewer Link",
  })
  const controlClientUrlInput = page.getByRole("textbox", {
    name: "Control Link",
  })
  await expect(readonlyClientUrlInput).toBeVisible({ timeout: 30_000 })
  await expect(controlClientUrlInput).toBeVisible()
  await expect(page).toHaveURL(/(?:\?|&)control=42(?:&|$)/)
  await expect
    .poll(() => readonlyClientUrlInput.inputValue(), {
      message: "readonly client URL should include a remote peer id",
    })
    .toContain("?rid=")

  const readonlyClientUrl = await readonlyClientUrlInput.inputValue()

  expect(readonlyClientUrl).not.toContain("control=42")
  await expect
    .poll(() => controlClientUrlInput.inputValue(), {
      message: "control client URL should include the control marker",
    })
    .toContain("&control=42")

  return controlClientUrlInput.inputValue()
}

export async function enableRemoteModeWithClientUrls(
  page: Page,
): Promise<RemoteClientUrls> {
  const controlClientUrl = await enableRemoteMode(page)
  const readonlyClientUrl = await page
    .getByRole("textbox", { name: "Viewer Link" })
    .inputValue()

  return {
    controlClientUrl,
    readonlyClientUrl,
  }
}

export async function openClientFromSettings(
  page: Page,
  clientUrl: string,
  label = "Control Link",
) {
  const clientPagePromise = page.waitForEvent("popup")
  await page
    .getByRole("textbox", { name: label })
    .locator("..")
    .getByRole("link", { name: "Open URL" })
    .click()
  const clientPage = await clientPagePromise

  await expect(clientPage).toHaveURL(clientUrl)
  await expect(clientPage).toHaveURL(/rid=/)
  return clientPage
}

export async function openClientsFromSettings(
  page: Page,
  clientUrl: string,
  count: number,
  label = "Control Link",
) {
  const clients: Page[] = []

  for (let index = 0; index < count; index += 1) {
    clients.push(await openClientFromSettings(page, clientUrl, label))
  }

  return clients
}

export async function closeSettingsOverlay(page: Page) {
  await page.getByRole("button", { name: "Done" }).click()
  await expect(page.getByTestId("settings-drawer")).not.toBeVisible()
}

export async function expectUrlQrCode(page: Page, label: string) {
  await page.getByRole("button", { name: `Show ${label}` }).click()
  const heading = label.endsWith("Client URL")
    ? label.replace(/\s+URL$/, "")
    : `${label}`
  const qrCodeDialog = page.getByRole("dialog", { name: heading })

  await expect(qrCodeDialog).toBeVisible()
  await expect(
    qrCodeDialog.getByRole("img", { name: `${label}` }),
  ).toBeVisible()

  await qrCodeDialog.click()
  await expect(qrCodeDialog).not.toBeVisible()
}

export async function openSettingsOverlay(page: Page) {
  await page.getByRole("button", { name: "Settings" }).click()
  const settingsDrawer = page.getByTestId("settings-drawer")
  await expect(settingsDrawer).toBeVisible()
  await expect(settingsDrawer.getByLabel("Title")).toBeVisible()
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
  const settingsDrawer = page.getByTestId("settings-drawer")

  if (title !== undefined) {
    await settingsDrawer.getByLabel("Title").fill(title)
  }
  if (minutes !== undefined) {
    await settingsDrawer.getByLabel("Minutes").fill(minutes)
  }
  if (seconds !== undefined) {
    await settingsDrawer.getByLabel("Seconds").fill(seconds)
  }
  if (backgroundColor !== undefined) {
    await settingsDrawer.getByLabel("Background").fill(backgroundColor)
  }
  if (foregroundColor !== undefined) {
    await settingsDrawer.getByLabel("Foreground").fill(foregroundColor)
  }
  if (primaryColor !== undefined) {
    await settingsDrawer.getByLabel("Primary").fill(primaryColor)
  }
}

export async function expectTimerRunning(page: Page) {
  await expect(page.getByRole("button", { name: "PAUSE" })).toBeVisible({
    timeout: 15_000,
  })

  await expectTimerDisplayRunning(page)
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
  await expect(timerDisplay.getByLabel("Minutes")).toHaveAttribute("readonly", "")
  await expect(timerDisplay.getByLabel("Seconds")).toHaveAttribute("readonly", "")
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
    const editableTitle = page.getByTitle("Click to edit title")

    if ((await editableTitle.count()) > 0) {
      await expect(editableTitle).toHaveText(settings.title)
    } else {
      await expect(
        page.getByText(settings.title, { exact: true }),
      ).toBeVisible()
    }
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
      new RegExp(`(?:\\?|&)pc=${settings.primaryColor.slice(1)}(?:&|$)`),
    )
  }
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

export async function getPeerDebugState(page: Page): Promise<PeerDebugState> {
  const debugState = page.getByTestId("peer-debug-state")

  return {
    connectionCount:
      (await debugState.getAttribute("data-connection-count")) ?? "",
    peerId: (await debugState.getAttribute("data-peer-id")) ?? "",
    role: (await debugState.getAttribute("data-peer-role")) ?? "",
    status: (await debugState.getAttribute("data-peer-status")) ?? "",
  }
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
  await expect
    .poll(
      async () => {
        const states = await Promise.all(pages.map(getPeerDebugState))

        return {
          connectedClients: states.filter(
            ({ connectionCount, role, status }) =>
              connectionCount === "1" &&
              role === "client" &&
              status === "connected",
          ).length,
          electedMain: states.filter(
            ({ connectionCount, role, status }) =>
              connectionCount === String(mainConnectionCount) &&
              role === "main" &&
              status === "connected",
          ).length,
        }
      },
      {
        timeout,
        message,
      },
    )
    .toEqual({
      connectedClients: clientCount,
      electedMain: 1,
    })
}

export async function getMainPage(pages: Page[]) {
  for (const page of pages) {
    const state = await getPeerDebugState(page)
    if (state.role === "main" && state.status === "connected") {
      return page
    }
  }

  throw new Error("No connected main page found")
}
