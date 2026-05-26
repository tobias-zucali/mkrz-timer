import { devices, expect, Page, test } from "@playwright/test"

import {
  expectScreenshotWithoutDebugInfo,
  getDisplayedSeconds,
  openTimer,
} from "./remote-mode.helpers"

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
      display: toRect(displayTitle),
      input: toRect(inputTitle),
      root: toRect(titleRoot),
    }
  })
}

async function getDisplayClampMetrics(page: Page) {
  return page.getByTestId("timer-title-text").evaluate((node) => {
    const element = node as HTMLElement
    const computedStyle = window.getComputedStyle(element)
    const lineHeightPx = Number.parseFloat(computedStyle.lineHeight) || 0
    const paddingTopPx = Number.parseFloat(computedStyle.paddingTop) || 0
    const paddingBottomPx = Number.parseFloat(computedStyle.paddingBottom) || 0

    return {
      clientHeight: element.clientHeight,
      lineHeightPx,
      paddingBottomPx,
      paddingTopPx,
      scrollHeight: element.scrollHeight,
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

test("keeps long non-focused titles compact within the title height budget", async ({
  page,
}) => {
  await openTimer(page, 3)
  await setInlineTitle(
    page,
    "das ist eine sehr schoene und doch auch spannende loesung fuer einen absichtlich langen titel der auf jeden fall in eine dritte zeile umbrechen wuerde",
  )

  const clampMetrics = await getDisplayClampMetrics(page)

  expect(clampMetrics.scrollHeight).toBeGreaterThan(clampMetrics.clientHeight)
  expect(clampMetrics.clientHeight).toBeGreaterThan(
    clampMetrics.lineHeightPx * 1.8,
  )
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
    await openTimer(page, 5)

    await page.getByRole("button", { name: "START" }).click()
    await expect(page.getByRole("button", { name: "PAUSE" })).toBeVisible()

    await expect
      .poll(() => getDisplayedSeconds(page), {
        message: "timer should count down after start",
        timeout: 4_000,
      })
      .toBeLessThan(5)

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
    await openTimer(page, 3)

    await page.getByRole("button", { name: "START" }).click()

    await expect
      .poll(() => getDisplayedSeconds(page), {
        message: "timer should reach zero",
        timeout: 6_000,
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

test(
  "matches full timer layout across simulated form factors",
  { tag: "@visual" },
  async ({ baseURL, browser }) => {
    test.slow()

    for (const { name, contextOptions } of timerVisualFormFactors) {
      const context = await browser.newContext(contextOptions)
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
  "matches clamped-title layouts across form factors and orientations",
  { tag: "@visual" },
  async ({ baseURL, browser }) => {
    test.slow()

    const title =
      "das ist eine sehr schoene und doch auch spannende loesung fuer einen absichtlich langen titel der auf jeden fall in eine dritte zeile umbrechen wuerde"
    for (const { name, contextOptions } of timerVisualFormFactors) {
      const context = await browser.newContext(contextOptions)
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

      const clampMetrics = await getDisplayClampMetrics(devicePage)
      const expectedTwoLineHeight =
        clampMetrics.lineHeightPx * 2 +
        clampMetrics.paddingTopPx +
        clampMetrics.paddingBottomPx

      expect(clampMetrics.scrollHeight).toBeGreaterThan(
        clampMetrics.clientHeight,
      )
      expect(clampMetrics.clientHeight).toBeLessThanOrEqual(
        Math.ceil(expectedTwoLineHeight) + 1,
      )

      await expectScreenshotWithoutDebugInfo(devicePage, {
        fullPage: true,
        message: `${name} layout should clamp long titles without a visible third row`,
        name: `timer-layout-${name}-clamped-title.png`,
      })

      await context.close()
    }
  },
)
