import { devices, expect, Page, test } from "@playwright/test"

import {
  expectScreenshotWithoutDebugInfo,
  getDisplayedSeconds,
  openTimer,
} from "./remote-mode.helpers"

async function setTimer(page: Page, minutes: string, seconds: string) {
  await page.getByLabel("Minutes").fill(minutes)
  await page.getByLabel("Seconds").fill(seconds)
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

  const minutesInput = page.getByLabel("Minutes")
  const secondsInput = page.getByLabel("Seconds")

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
      await expect(devicePage.getByRole("button", { name: "START" })).toBeVisible()

      await expectScreenshotWithoutDebugInfo(devicePage, {
        fullPage: true,
        message: `${name} timer layout should stay visually stable`,
        name: `timer-layout-${name}.png`,
      })

      await context.close()
    }
  },
)
