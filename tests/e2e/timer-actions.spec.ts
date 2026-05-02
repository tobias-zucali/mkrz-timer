import { expect, Page, test } from "@playwright/test"

import {
  closeSettingsOverlay,
  expectTimerSettings,
  expectTimerUrlParams,
  getDisplayedSeconds,
  openSettingsOverlay,
  updateTimerSettings,
} from "./remote-mode.helpers"

async function openTimer(page: Page, seconds = 3) {
  await page.goto(
    `/?m=00&s=${seconds.toString().padStart(2, "0")}&bg=000000&fg=ffffff&pc=d61f69`,
  )
}

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

test("starts, pauses, and resumes the timer", async ({ page }) => {
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
})

test("runs a short timer to completion and resets it", async ({ page }) => {
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
})

test("updates title, duration, and colors through settings", async ({ page }) => {
  await openTimer(page, 3)

  const settings = {
    backgroundColor: "#123456",
    foregroundColor: "#fefefe",
    minutes: "02",
    primaryColor: "#00aa88",
    seconds: "15",
    title: "Workshop timer",
  }

  await openSettingsOverlay(page)
  await updateTimerSettings(page, settings)
  await closeSettingsOverlay(page)

  await expectTimerSettings(page, settings)
  await expectTimerUrlParams(page, settings)
})
