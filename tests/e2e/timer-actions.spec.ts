import { devices, expect, Page, test } from "@playwright/test"

import {
  expectScreenshotWithoutDebugInfo,
  getDisplayedSeconds,
  openTimer,
} from "./remote-mode.helpers"

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

test("supports multiline titles with adaptive scaling and a compact empty state", async ({
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

  const displayHeight = await getTitleRootHeight(page)
  await titleRoot.getByTestId("timer-title-input").click()
  await expect(titleRoot.getByTestId("timer-title-input")).toBeFocused()
  const focusHeight = await getTitleRootHeight(page)
  expect(Math.abs(focusHeight - displayHeight)).toBeLessThan(10)
  await page.getByTestId("timer-display").click()

  await setInlineTitle(
    page,
    "Quarterly planning\nretrospective and facilitator notes",
  )
  const longTitleMetrics = await getTitleMetrics(page)

  expect(longTitleMetrics.text).toBe(
    "Quarterly planning\nretrospective and facilitator notes",
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

test("keeps long multiline titles readable in fullscreen mode", async ({
  page,
}) => {
  await openTimer(page, 3)
  await setInlineTitle(
    page,
    "Quarterly planning\nretrospective and facilitator notes",
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
    const formFactors = [
      {
        name: "desktop",
        contextOptions: {
          viewport: { width: 1440, height: 1100 },
        },
      },
      {
        name: "tablet",
        contextOptions: {
          ...devices["iPad Mini"],
        },
      },
      {
        name: "phone",
        contextOptions: {
          ...devices["iPhone 13"],
        },
      },
    ] as const

    for (const { name, contextOptions } of formFactors) {
      const context = await browser.newContext(contextOptions)
      const devicePage = await context.newPage()

      await openTimer(devicePage, 3, baseURL)
      await expect(
        devicePage.getByRole("button", { name: "START" }),
      ).toBeVisible()

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
  "matches long-title layouts across form factors and orientations",
  { tag: "@visual" },
  async ({ baseURL, browser }) => {
    const encodedTitle = encodeURIComponent(
      "Quarterly planning\nretrospective and facilitator notes",
    )
    const formFactors = [
      {
        name: "desktop-long-title",
        contextOptions: {
          viewport: { width: 1440, height: 1100 },
        },
      },
      {
        name: "tablet-portrait-long-title",
        contextOptions: {
          ...devices["iPad Mini"],
        },
      },
      {
        name: "tablet-landscape-long-title",
        contextOptions: {
          ...devices["iPad Mini landscape"],
        },
      },
      {
        name: "phone-portrait-long-title",
        contextOptions: {
          ...devices["iPhone 13"],
        },
      },
      {
        name: "phone-landscape-long-title",
        contextOptions: {
          ...devices["iPhone 13 landscape"],
        },
      },
    ] as const

    for (const { name, contextOptions } of formFactors) {
      const context = await browser.newContext(contextOptions)
      const devicePage = await context.newPage()

      await devicePage.goto(
        baseURL
          ? new URL(
              `/?v=1&t=3!d61f69!${encodedTitle}!0&bg=000000&fg=ffffff`,
              baseURL,
            ).toString()
          : `/?v=1&t=3!d61f69!${encodedTitle}!0&bg=000000&fg=ffffff`,
      )
      await expect(
        devicePage.getByRole("button", { name: "START" }),
      ).toBeVisible()

      await expectScreenshotWithoutDebugInfo(devicePage, {
        fullPage: true,
        message: `${name} layout should keep the long title readable`,
        name: `timer-layout-${name}.png`,
      })

      await context.close()
    }
  },
)
