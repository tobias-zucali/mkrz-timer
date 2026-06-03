import { devices } from "@playwright/test"

import {
  expectScreenshotWithoutDebugInfo,
  getDisplayedSeconds,
  openTimer,
  openSidebarPanel,
  updateTimerSettings,
} from "./live-session.helpers"
import { expect, installE2eBrowserMocks, test, type Page } from "./test"

const timerVisualFormFactors = [
  {
    name: "desktop",
    contextOptions: {
      viewport: { width: 1440, height: 1100 },
    },
  },
  {
    name: "desktop-short",
    contextOptions: {
      viewport: { width: 1280, height: 720 },
    },
  },
  {
    name: "tablet-portrait",
    contextOptions: {
      ...devices["iPad Mini"],
    },
  },
  {
    name: "tablet-landscape",
    contextOptions: {
      ...devices["iPad Mini landscape"],
    },
  },
  {
    name: "phone-portrait",
    contextOptions: {
      ...devices["iPhone 13"],
    },
  },
  {
    name: "phone-landscape",
    contextOptions: {
      ...devices["iPhone 13 landscape"],
    },
  },
  {
    name: "phone-small",
    contextOptions: {
      ...devices["iPhone SE"],
    },
  },
] as const

async function setTimer(page: Page, minutes: string, seconds: string) {
  const timerDisplay = page.getByTestId("timer-display")
  await timerDisplay.getByLabel("Minutes").fill(minutes)
  await timerDisplay.getByLabel("Seconds").fill(seconds)
}

async function setInlineTitle(page: Page, title: string) {
  const titleRoot = page.getByTestId("timer-title")
  const emptyAction = titleRoot.getByTestId("timer-title-empty-action")
  const editor = titleRoot.getByTestId("timer-title-input")

  if ((await emptyAction.count()) > 0) {
    await emptyAction.click()
  }

  await editor.fill(title)
  await page.getByTestId("timer-display").click()
}

function buildTimerUrl({
  backgroundColor = "000000",
  foregroundColor = "ffffff",
  primaryColor = "d61f69",
  seconds = 3,
  title = "",
}: {
  backgroundColor?: string
  foregroundColor?: string
  primaryColor?: string
  seconds?: number
  title?: string
}) {
  return `/?v=1&t=${seconds}!${primaryColor}!${encodeURIComponent(title)}!0&a=0&bg=${backgroundColor}&fg=${foregroundColor}`
}

function toComputedRgb(hexColor: string) {
  const normalized = hexColor.replace(/^#/, "")
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)

  return `rgb(${red}, ${green}, ${blue})`
}

async function getTitleMetrics(page: Page) {
  const titleRoot = page.getByTestId("timer-title")
  const titleText = titleRoot.getByTestId("timer-title-text")

  if ((await titleText.count()) > 0) {
    return titleText.evaluate((node) => {
      const element = node as HTMLElement
      const computedStyle = window.getComputedStyle(element)
      const rootElement = document.querySelector(
        '[data-testid="timer-title"]',
      ) as HTMLElement | null

      return {
        fontSize: Number.parseFloat(computedStyle.fontSize),
        rootHeight: rootElement?.getBoundingClientRect().height ?? 0,
        text: element.textContent ?? "",
      }
    })
  }

  return titleRoot.getByTestId("timer-title-input").evaluate((node) => {
    const element = node as HTMLElement
    const computedStyle = window.getComputedStyle(element)
    const rootElement = document.querySelector(
      '[data-testid="timer-title"]',
    ) as HTMLElement | null

    return {
      fontSize: Number.parseFloat(computedStyle.fontSize),
      rootHeight: rootElement?.getBoundingClientRect().height ?? 0,
      text: (node as HTMLTextAreaElement).value,
    }
  })
}

async function getTitleOverflowMetrics(page: Page) {
  return page.evaluate(() => {
    const inputTitle = document.querySelector(
      '[data-testid="timer-title-input"]',
    ) as HTMLTextAreaElement | null

    if (!inputTitle) {
      return null
    }

    return {
      clientHeight: inputTitle.clientHeight,
      scrollHeight: inputTitle.scrollHeight,
    }
  })
}

async function getTitleRootHeight(page: Page) {
  return page
    .getByTestId("timer-title")
    .evaluate((node) => node.getBoundingClientRect().height)
}

async function getTitlePositionMetrics(page: Page) {
  return page.evaluate(() => {
    const titleRoot = document.querySelector(
      '[data-testid="timer-title"]',
    ) as HTMLElement | null
    const displayTitle = document.querySelector(
      '[data-testid="timer-title-text"]',
    ) as HTMLElement | null
    const inputTitle = document.querySelector(
      '[data-testid="timer-title-input"]',
    ) as HTMLTextAreaElement | null

    const toRect = (element: HTMLElement | null) => {
      if (!element) {
        return null
      }

      const rect = element.getBoundingClientRect()
      return {
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width,
      }
    }

    return {
      display: toRect(displayTitle ?? inputTitle),
      input: toRect(inputTitle),
      root: toRect(titleRoot),
    }
  })
}

async function getControlChromeMetrics(page: Page) {
  return page.evaluate(() => {
    const sidebarToggle = document.querySelector(
      'button[aria-label="Toggle navigation"]',
    ) as HTMLElement | null
    const titleAction = document.querySelector(
      '[data-testid="timer-title-empty-action"]',
    ) as HTMLElement | null
    const topRight = document.querySelector(
      '[data-testid="top-right-controls"]',
    ) as HTMLElement | null
    const timerControls = document.querySelector(
      '[data-testid="timer-controls"]',
    ) as HTMLElement | null

    const readMetrics = (element: HTMLElement | null) => {
      if (!element) {
        return null
      }

      const rect = element.getBoundingClientRect()
      const style = window.getComputedStyle(element)

      return {
        display: style.display,
        opacity: Number.parseFloat(style.opacity),
        rectHeight: rect.height,
        rectWidth: rect.width,
      }
    }

    return {
      sidebarToggle: readMetrics(sidebarToggle),
      timerControls: readMetrics(timerControls),
      titleAction: readMetrics(titleAction),
      topRight: readMetrics(topRight),
    }
  })
}

async function expectMainTimerContentToFitViewport(page: Page) {
  const viewport = page.viewportSize()
  expect(viewport).not.toBeNull()

  const metrics = await page.evaluate(() => {
    const body = document.body
    const documentElement = document.documentElement
    const title = document.querySelector('[data-testid="timer-title"]')
    const display = document.querySelector('[data-testid="timer-display"]')
    const controls = document.querySelector('[data-testid="timer-controls"]')
    const startButton = Array.from(document.querySelectorAll("button")).find(
      (node) => node.textContent?.trim() === "START",
    )

    const toRect = (node: Element | null) => {
      if (!node) {
        return null
      }

      const rect = node.getBoundingClientRect()

      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      }
    }

    return {
      bodyScrollWidth: body.scrollWidth,
      controls: toRect(controls),
      display: toRect(display),
      documentScrollWidth: documentElement.scrollWidth,
      startButton: toRect(startButton ?? null),
      title: toRect(title),
    }
  })

  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(
    (viewport?.width ?? 0) + 1,
  )
  expect(metrics.documentScrollWidth).toBeLessThanOrEqual(
    (viewport?.width ?? 0) + 1,
  )
  expect(metrics.title).not.toBeNull()
  expect(metrics.display).not.toBeNull()
  expect(metrics.controls).not.toBeNull()
  expect(metrics.startButton).not.toBeNull()

  const elements = [
    metrics.title,
    metrics.display,
    metrics.controls,
    metrics.startButton,
  ]

  for (const rect of elements) {
    expect(rect?.height ?? 0).toBeGreaterThan(0)
    expect(rect?.width ?? 0).toBeGreaterThan(0)
    expect(rect?.left ?? 0).toBeGreaterThanOrEqual(-1)
    expect(rect?.right ?? 0).toBeLessThanOrEqual((viewport?.width ?? 0) + 1)
    expect(rect?.top ?? 0).toBeGreaterThanOrEqual(-1)
    expect(rect?.bottom ?? 0).toBeLessThanOrEqual((viewport?.height ?? 0) + 1)
  }

  expect((metrics.title?.bottom ?? 0) <= (metrics.display?.top ?? 0) + 8).toBe(
    true,
  )
  expect(
    (metrics.display?.bottom ?? 0) <= (metrics.controls?.top ?? 0) + 8,
  ).toBe(true)
}

test("applies custom URL colors on the first load without waiting for interaction", async ({
  page,
}) => {
  await page.addInitScript(() => {
    ;(
      window as typeof window & {
        __themeSamples?: Array<{
          background: string
          foreground: string
          primary: string
        }>
      }
    ).__themeSamples = []

    document.addEventListener("DOMContentLoaded", () => {
      requestAnimationFrame(() => {
        const rootStyle = window.getComputedStyle(document.documentElement)
        const bodyStyle = window.getComputedStyle(document.body)

        ;(
          window as typeof window & {
            __themeSamples?: Array<{
              background: string
              foreground: string
              primary: string
            }>
          }
        ).__themeSamples?.push({
          background: bodyStyle.backgroundColor,
          foreground: bodyStyle.color,
          primary: rootStyle.getPropertyValue("--primary").trim(),
        })
      })
    })
  })

  await page.goto(
    buildTimerUrl({
      backgroundColor: "112233",
      foregroundColor: "ddeeff",
      primaryColor: "d61f69",
      seconds: 60,
      title: "First paint",
    }),
  )

  const themeSamples = await page.evaluate(() => {
    return (
      window as typeof window & {
        __themeSamples?: Array<{
          background: string
          foreground: string
          primary: string
        }>
      }
    ).__themeSamples
  })

  expect(themeSamples).toEqual([
    {
      background: toComputedRgb("#112233"),
      foreground: toComputedRgb("#ddeeff"),
      primary: "214 31 105",
    },
  ])
})

const durationCases = [
  { minutes: "00", seconds: "05", totalSeconds: 5 },
  { minutes: "01", seconds: "30", totalSeconds: 90 },
  { minutes: "01", seconds: "75", totalSeconds: 135 },
  { minutes: "12", seconds: "34", totalSeconds: 754 },
]

for (const { minutes, seconds, totalSeconds } of durationCases) {
  test(`changes the timer duration to ${minutes}:${seconds} before starting`, async ({
    page,
  }) => {
    await openTimer(page, 3)

    await setTimer(page, minutes, seconds)

    await expect
      .poll(() => getDisplayedSeconds(page), {
        message: "timer display should reflect edited duration",
      })
      .toBe(totalSeconds)
  })
}

test("keeps the timer usable after strange duration input", async ({
  page,
}) => {
  await openTimer(page, 3)

  const timerDisplay = page.getByTestId("timer-display")
  const minutesInput = timerDisplay.getByLabel("Minutes")
  const secondsInput = timerDisplay.getByLabel("Seconds")

  await minutesInput.selectText()
  await minutesInput.pressSequentially("abc-+e")
  await secondsInput.selectText()
  await secondsInput.pressSequentially("xyz!@#")

  await expect
    .poll(() => getDisplayedSeconds(page), {
      message: "strange input should not produce a broken timer value",
    })
    .toBeGreaterThanOrEqual(0)

  await setTimer(page, "00", "03")
  await page.getByRole("button", { name: "START" }).click()
  await expect(page.getByRole("button", { name: "PAUSE" })).toBeVisible()
  await expect
    .poll(() => getDisplayedSeconds(page), {
      message: "timer should still count down after strange input is replaced",
      timeout: 4_000,
    })
    .toBeLessThan(3)
})

test("supports wrapped single-paragraph titles with class-based sizing and a compact empty state", async ({
  page,
}) => {
  await openTimer(page, 3)

  const titleRoot = page.getByTestId("timer-title")
  await expect(titleRoot).toHaveAttribute("data-title-mode", "empty")
  await expect(
    titleRoot.getByRole("button", { name: "Add title" }),
  ).toBeVisible()
  await expect(titleRoot.getByTestId("timer-title-input")).toHaveCount(1)
  await expect(
    titleRoot.evaluate((node) => node.getBoundingClientRect().height),
  ).resolves.toBeLessThan(80)

  await setInlineTitle(page, "Sprint")
  const shortTitleMetrics = await getTitleMetrics(page)
  expect(shortTitleMetrics.text).toBe("Sprint")
  expect(shortTitleMetrics.rootHeight).toBeGreaterThan(49)

  const displayHeight = await getTitleRootHeight(page)
  const displayPosition = await getTitlePositionMetrics(page)
  await titleRoot.getByTestId("timer-title-input").click()
  await expect(titleRoot.getByTestId("timer-title-input")).toBeFocused()
  const focusHeight = await getTitleRootHeight(page)
  const focusPosition = await getTitlePositionMetrics(page)
  expect(Math.abs(focusHeight - displayHeight)).toBeLessThan(10)
  expect(
    Math.abs(
      (displayPosition.display?.top ?? 0) - (focusPosition.input?.top ?? 0),
    ),
  ).toBeLessThan(1.5)
  expect(
    Math.abs(
      (displayPosition.display?.left ?? 0) - (focusPosition.input?.left ?? 0),
    ),
  ).toBeLessThan(1.5)
  expect(
    Math.abs(
      (displayPosition.display?.width ?? 0) - (focusPosition.input?.width ?? 0),
    ),
  ).toBeLessThan(1.5)
  await page.getByTestId("timer-display").click()

  await setInlineTitle(
    page,
    "Quarterly planning retrospective and facilitator notes",
  )
  const longTitleMetrics = await getTitleMetrics(page)

  expect(longTitleMetrics.text).toBe(
    "Quarterly planning retrospective and facilitator notes",
  )
  expect(longTitleMetrics.fontSize).toBeLessThan(shortTitleMetrics.fontSize)
  expect(longTitleMetrics.rootHeight).toBeLessThan(160)

  await setInlineTitle(page, "")
  await expect(titleRoot).toHaveAttribute("data-title-mode", "empty")
  await expect(
    titleRoot.getByRole("button", { name: "Add title" }),
  ).toBeVisible()
  await expect(
    titleRoot.evaluate((node) => node.getBoundingClientRect().height),
  ).resolves.toBeLessThan(80)
})

test("keeps long non-focused titles fully visible", async ({ page }) => {
  await openTimer(page, 3)
  const title = "das ist eine spannende loesung und auf jeden fall gut sichtbar"
  await setInlineTitle(page, title)
  const titleMetrics = await getTitleMetrics(page)
  const titleOverflowMetrics = await getTitleOverflowMetrics(page)
  expect(titleMetrics.text).toBe(title)
  expect(titleOverflowMetrics).not.toBeNull()
  expect(
    (titleOverflowMetrics?.scrollHeight ?? 0) -
      (titleOverflowMetrics?.clientHeight ?? 0),
  ).toBeLessThanOrEqual(2)
})

test("keeps long wrapped titles readable in fullscreen mode", async ({
  page,
}) => {
  await openTimer(page, 3)
  await setInlineTitle(
    page,
    "Quarterly planning retrospective and facilitator notes",
  )

  await page.locator("body").click()
  await page.evaluate(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
    }
  })

  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(true)

  const titleMetrics = await getTitleMetrics(page)
  expect(titleMetrics.rootHeight).toBeLessThan(160)

  await page.evaluate(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    }
  })
})

test(
  "starts, pauses, and resumes the timer",
  { tag: "@smoke" },
  async ({ page }) => {
    test.slow()

    await openTimer(page, 30)

    await page.getByRole("button", { name: "START" }).click()
    await expect(page.getByRole("button", { name: "PAUSE" })).toBeVisible()

    await expect
      .poll(() => getDisplayedSeconds(page), {
        message: "timer should count down after start",
        timeout: 4_000,
      })
      .toBeLessThan(30)

    await page.getByRole("button", { name: "PAUSE" }).click()
    await expect(page.getByRole("button", { name: "START" })).toBeVisible()

    const pausedAt = await getDisplayedSeconds(page)
    await page.waitForTimeout(1_200)
    await expect(getDisplayedSeconds(page)).resolves.toBe(pausedAt)

    await page.getByRole("button", { name: "START" }).click()
    await expect(page.getByRole("button", { name: "PAUSE" })).toBeVisible()
    await expect
      .poll(() => getDisplayedSeconds(page), {
        message: "timer should continue counting down after resume",
        timeout: 4_000,
      })
      .toBeLessThan(pausedAt)
  },
)

test(
  "runs a short timer to completion and resets it",
  { tag: "@smoke" },
  async ({ page }) => {
    test.slow()

    await openTimer(page, 3)

    await page.getByRole("button", { name: "START" }).click()

    await expect
      .poll(() => getDisplayedSeconds(page), {
        message: "timer should reach zero",
        timeout: 10_000,
      })
      .toBe(0)

    await expect(page.getByRole("button", { name: "RESET" })).toBeEnabled()
    await page.getByRole("button", { name: "RESET" }).click()

    await expect
      .poll(() => getDisplayedSeconds(page), {
        message: "timer should restore the configured duration after reset",
      })
      .toBe(3)
  },
)

test("announces timer state changes and uses semantic readout mode", async ({
  page,
}) => {
  await openTimer(page, 12)

  const liveRegion = page.getByRole("status", { name: "Timer announcements" })

  await page.getByRole("button", { name: "START" }).click()
  await expect(
    page.getByRole("timer", {
      name: /Running\. Remaining time\. 12 seconds/i,
    }),
  ).toBeVisible()
  await expect(page.getByRole("spinbutton", { name: "Minutes" })).toHaveCount(0)
  await expect(page.getByRole("spinbutton", { name: "Seconds" })).toHaveCount(0)
  await expect(liveRegion).toContainText("12 seconds timer started.")

  await expect
    .poll(async () => (await liveRegion.textContent()) ?? "", {
      message: "timer should announce the final countdown milestone",
      timeout: 8_000,
    })
    .toContain("Five.")

  await page.getByRole("button", { name: "PAUSE" }).click()
  await expect(liveRegion).toContainText("Paused.")

  await page.getByRole("button", { name: "RESET" }).click()
  await expect(liveRegion).toContainText("Timer reset to 12 seconds.")
})

test("keeps paused step switches silent and auto-advances running sequences", async ({
  page,
}) => {
  test.slow()

  await openTimer(page, 3)
  await updateTimerSettings(page, {
    ttsEnabled: true,
  })

  await openSidebarPanel(page, "Timer")
  const timerPanel = page.getByTestId("sidebar-panel-timer")
  await timerPanel.getByLabel("End Behavior").selectOption("advance")
  await timerPanel.getByRole("button", { name: "Add step" }).click()
  await timerPanel.getByLabel("Seconds").fill("05")

  const liveRegion = page.getByRole("status", { name: "Timer announcements" })

  await timerPanel.getByRole("button", { name: "Make active" }).click()
  await expect(liveRegion).not.toContainText("started")

  await page.getByRole("button", { name: "Close sidebar" }).last().click()

  await page.getByRole("button", { name: "Previous step" }).click()
  await expect(liveRegion).not.toContainText("started")

  await page.getByRole("button", { name: "Next step" }).click()
  await expect(liveRegion).not.toContainText("started")

  await page.getByRole("button", { name: "Previous step" }).click()
  await page.getByRole("button", { name: "START" }).click()

  await expect(liveRegion).toContainText("3 seconds timer started.")
  await expect
    .poll(() => getDisplayedSeconds(page), {
      message: "timer should continue running on the next step",
      timeout: 8_000,
    })
    .toBeGreaterThan(0)
  await expect(liveRegion).toContainText("5 seconds timer started.")
})

test("applies shortcut focus rules and minute adjustments", async ({
  page,
}) => {
  test.slow()

  await openTimer(page, 30)
  await openSidebarPanel(page, "Timer")

  await page.keyboard.press("p")
  await expect(page.getByRole("button", { name: "PAUSE" })).toBeVisible()

  const timerPanel = page.getByTestId("sidebar-panel-timer")
  const displayedBeforeBlockedKeys = await getDisplayedSeconds(page)

  await timerPanel.getByLabel("Seconds").focus()
  await page.keyboard.press("Space")
  await page.keyboard.press("r")
  await page.waitForTimeout(1_200)

  await expect(page.getByRole("button", { name: "PAUSE" })).toBeVisible()
  expect(await getDisplayedSeconds(page)).toBeLessThan(
    displayedBeforeBlockedKeys,
  )

  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  })
  await page.keyboard.press("p")
  await expect(page.getByRole("button", { name: "START" })).toBeVisible()

  await page.keyboard.press("r")
  await expect.poll(() => getDisplayedSeconds(page)).toBe(30)

  await page.keyboard.press("ArrowUp")
  await expect.poll(() => getDisplayedSeconds(page)).toBe(90)

  await page.keyboard.press("ArrowDown")
  await expect.poll(() => getDisplayedSeconds(page)).toBe(60)

  await setTimer(page, "05", "00")
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  })
  await page.keyboard.press(" ")
  await page.waitForTimeout(1_200)

  const displayedBeforeRuntimeExtension = await getDisplayedSeconds(page)

  await page.keyboard.press("ArrowUp")
  await expect
    .poll(() => getDisplayedSeconds(page), {
      message:
        "ArrowUp while running should extend remaining time by one minute",
    })
    .toBe(displayedBeforeRuntimeExtension + 60)

  await page.keyboard.press("r")
  await expect.poll(() => getDisplayedSeconds(page)).toBe(300)

  await setTimer(page, "00", "03")
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  })
  await page.keyboard.press(" ")
  await page.waitForTimeout(3_500)

  const timedOutSeconds = await getDisplayedSeconds(page)

  await page.keyboard.press("ArrowDown")
  await page.waitForTimeout(200)
  await expect.poll(() => getDisplayedSeconds(page)).toBe(timedOutSeconds)

  await page.keyboard.press("ArrowUp")
  await expect(page.getByRole("button", { name: "PAUSE" })).toBeVisible()
  await expect
    .poll(() => getDisplayedSeconds(page), {
      message: "ArrowUp from timeout should restart the timer at one minute",
    })
    .toBeLessThanOrEqual(60)
  await expect
    .poll(() => getDisplayedSeconds(page), {
      message: "restarted timed-out timer should be counting down",
    })
    .toBeLessThan(60)
})

test("keeps timer chrome mounted on small screens and dims it after idle", async ({
  page,
}) => {
  await page.setViewportSize(devices["iPhone SE"].viewport)
  await openTimer(page, 12)

  await expect(page.getByTestId("top-right-controls")).toBeVisible()
  await expect(page.getByTestId("timer-controls")).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Toggle navigation" }),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Add title" })).toBeVisible()

  await expect
    .poll(() => getControlChromeMetrics(page))
    .toMatchObject({
      sidebarToggle: {
        display: "inline-flex",
        opacity: 1,
      },
      timerControls: {
        display: "flex",
        opacity: 1,
      },
      titleAction: {
        display: "flex",
        opacity: 1,
      },
      topRight: {
        display: "flex",
        opacity: 1,
      },
    })

  await page.waitForTimeout(5_200)

  await expect
    .poll(
      () => {
        return page.evaluate(() => {
          const topRight = document.querySelector(
            '[data-testid="top-right-controls"]',
          ) as HTMLElement | null
          const sidebarToggle = document.querySelector(
            'button[aria-label="Toggle navigation"]',
          ) as HTMLElement | null
          const timerControls = document.querySelector(
            '[data-testid="timer-controls"]',
          ) as HTMLElement | null
          const titleAction = document.querySelector(
            '[data-testid="timer-title-empty-action"]',
          ) as HTMLElement | null

          if (!topRight || !timerControls || !sidebarToggle || !titleAction) {
            return false
          }

          const topRightStyle = window.getComputedStyle(topRight)
          const sidebarToggleStyle = window.getComputedStyle(sidebarToggle)
          const timerControlsStyle = window.getComputedStyle(timerControls)
          const titleActionStyle = window.getComputedStyle(titleAction)

          return (
            topRightStyle.display === "flex" &&
            sidebarToggleStyle.display === "inline-flex" &&
            timerControlsStyle.display === "flex" &&
            titleActionStyle.display === "flex" &&
            Number.parseFloat(topRightStyle.opacity) > 0 &&
            Number.parseFloat(topRightStyle.opacity) < 1 &&
            Number.parseFloat(sidebarToggleStyle.opacity) > 0 &&
            Number.parseFloat(sidebarToggleStyle.opacity) < 1 &&
            Number.parseFloat(timerControlsStyle.opacity) > 0 &&
            Number.parseFloat(timerControlsStyle.opacity) < 1 &&
            Number.parseFloat(titleActionStyle.opacity) > 0 &&
            Number.parseFloat(titleActionStyle.opacity) < 1 &&
            topRight.getBoundingClientRect().height > 0 &&
            sidebarToggle.getBoundingClientRect().height > 0 &&
            timerControls.getBoundingClientRect().height > 0 &&
            titleAction.getBoundingClientRect().height > 0
          )
        })
      },
      {
        message:
          "timer chrome should dim instead of being removed after idling",
      },
    )
    .toBe(true)
})

test("restores full timer chrome visibility after pointer and keyboard interaction", async ({
  page,
}) => {
  await page.setViewportSize(devices["iPhone SE"].viewport)
  await openTimer(page, 12)
  await page.evaluate(() => {
    ;(document.activeElement as HTMLElement | null)?.blur?.()
  })

  await page.waitForTimeout(5_200)

  await expect
    .poll(async () => (await getControlChromeMetrics(page)).topRight?.opacity)
    .toBeLessThan(1)

  await page.mouse.move(40, 40)

  await expect
    .poll(async () => (await getControlChromeMetrics(page)).topRight?.opacity)
    .toBe(1)

  await page.waitForTimeout(5_200)

  await expect
    .poll(
      async () => (await getControlChromeMetrics(page)).timerControls?.opacity,
    )
    .toBeLessThan(1)

  await page.keyboard.press("Tab")

  await expect
    .poll(() => getControlChromeMetrics(page), {
      message: "keyboard interaction should restore full opacity",
    })
    .toMatchObject({
      sidebarToggle: {
        opacity: 1,
      },
      timerControls: {
        opacity: 1,
      },
      topRight: {
        opacity: 1,
      },
    })
})

test(
  "matches full timer layout across simulated form factors",
  { tag: "@visual" },
  async ({ baseURL, browser }) => {
    test.slow()

    for (const { name, contextOptions } of timerVisualFormFactors) {
      const context = await browser.newContext(contextOptions)
      await installE2eBrowserMocks(context)
      const devicePage = await context.newPage()

      await openTimer(devicePage, 3, baseURL)
      await expect(
        devicePage.getByRole("button", { name: "START" }),
      ).toBeVisible()
      await expectMainTimerContentToFitViewport(devicePage)

      await expectScreenshotWithoutDebugInfo(devicePage, {
        fullPage: true,
        message: `${name} timer layout should stay visually stable`,
        name: `timer-layout-${name}.png`,
      })

      await context.close()
    }
  },
)

test(
  "matches short-title layouts across form factors and orientations",
  { tag: "@visual" },
  async ({ baseURL, browser }) => {
    test.slow()

    const title = "Sprint review"
    for (const { name, contextOptions } of timerVisualFormFactors) {
      const context = await browser.newContext(contextOptions)
      await installE2eBrowserMocks(context)
      const devicePage = await context.newPage()

      await devicePage.goto(
        baseURL
          ? new URL(buildTimerUrl({ title }), baseURL).toString()
          : buildTimerUrl({ title }),
      )
      await expect(
        devicePage.getByRole("button", { name: "START" }),
      ).toBeVisible()
      await expectMainTimerContentToFitViewport(devicePage)

      await expectScreenshotWithoutDebugInfo(devicePage, {
        fullPage: true,
        message: `${name} layout should keep the short title readable`,
        name: `timer-layout-${name}-short-title.png`,
      })

      await context.close()
    }
  },
)

test(
  "matches long-title bucket layouts across form factors and orientations",
  { tag: "@visual" },
  async ({ baseURL, browser }) => {
    test.slow()

    const title = "Quarterly planning retrospective and facilitator notes"
    for (const { name, contextOptions } of timerVisualFormFactors) {
      const context = await browser.newContext(contextOptions)
      await installE2eBrowserMocks(context)
      const devicePage = await context.newPage()

      await devicePage.goto(
        baseURL
          ? new URL(buildTimerUrl({ title }), baseURL).toString()
          : buildTimerUrl({ title }),
      )
      await expect(
        devicePage.getByRole("button", { name: "START" }),
      ).toBeVisible()
      await expectMainTimerContentToFitViewport(devicePage)

      await expectScreenshotWithoutDebugInfo(devicePage, {
        fullPage: true,
        message: `${name} layout should keep the long title bucket readable`,
        name: `timer-layout-${name}-long-title.png`,
      })

      await context.close()
    }
  },
)

test(
  "matches the local timer screen aria structure",
  { tag: "@smoke" },
  async ({ page }) => {
    await openTimer(page, 3)

    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "local-timer-screen.aria.yml",
    })
  },
)
