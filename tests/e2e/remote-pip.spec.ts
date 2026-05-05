import { expect, Page, test } from "@playwright/test"

import {
  closeSettingsOverlay,
  expectTimerRunning,
  openSettingsOverlay,
  openTimer,
  updateTimerSettings,
} from "./remote-mode.helpers"

async function getFloatingTimerState(page: Page) {
  return page.evaluate(() => {
    const pipWindow = (
      window as Window & {
        documentPictureInPicture?: {
          window?: Window | null
        }
      }
    ).documentPictureInPicture?.window

    if (!pipWindow) {
      return null
    }

    const root = pipWindow.document.querySelector(
      '[data-testid="floating-timer-root"]',
    )
    const display = pipWindow.document.querySelector(
      '[data-testid="floating-timer-display"]',
    )

    return {
      backgroundColor: getComputedStyle(pipWindow.document.body)
        .backgroundColor,
      displayText: display?.textContent?.replace(/\s+/g, " ").trim() || "",
      hasButtons: pipWindow.document.querySelectorAll("button").length,
      rootText: root?.textContent?.replace(/\s+/g, " ").trim() || "",
    }
  })
}

function parseDisplayTextToSeconds(displayText: string) {
  const match = displayText.match(/^(\d{2}):(\d{2})$/)
  if (!match) {
    return null
  }

  const [, minutes, seconds] = match
  return Number(minutes) * 60 + Number(seconds)
}

async function getFloatingTimerSeconds(page: Page) {
  const state = await getFloatingTimerState(page)
  return parseDisplayTextToSeconds(state?.displayText ?? "")
}

async function expectFloatingTimerClosed(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          (
            window as Window & {
              documentPictureInPicture?: {
                window?: Window | null
              }
            }
          ).documentPictureInPicture?.window,
        ),
      ),
    )
    .toBe(false)
}

test("shows the floating timer action in local mode", async ({ page }) => {
  await openTimer(page, 3)
  await openSettingsOverlay(page)

  await expect(page.getByTestId("floating-timer-toggle")).toBeVisible()
})

test("hides the floating timer action when document PiP is unsupported", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "documentPictureInPicture", {
      configurable: true,
      value: undefined,
    })
  })

  await openTimer(page, 3)
  await openSettingsOverlay(page)

  await expect(page.getByTestId("floating-timer-toggle")).toBeDisabled()
  await expect(page.getByText(/document picture-in-picture/i)).toBeVisible()
})

test("opens a readonly floating timer in local mode and keeps it synced", async ({
  page,
}) => {
  await openTimer(page, 3)
  await openSettingsOverlay(page)

  await expect(page.getByTestId("floating-timer-toggle")).toBeVisible()
  await expect(page.getByTestId("floating-timer-toggle")).toBeEnabled()
  await page.getByTestId("floating-timer-toggle").click()

  await expect(page.getByTestId("floating-timer-toggle")).toBeChecked()
  await expect
    .poll(
      async () => {
        const state = await getFloatingTimerState(page)
        return {
          hasButtons: state?.hasButtons,
          seconds: parseDisplayTextToSeconds(state?.displayText ?? ""),
        }
      },
      {
        message:
          "floating timer window should open with readonly timer content",
      },
    )
    .toMatchObject({
      hasButtons: 0,
      seconds: expect.any(Number),
    })

  const initialFloatingSeconds = await getFloatingTimerSeconds(page)
  expect(initialFloatingSeconds).not.toBeNull()

  await closeSettingsOverlay(page)
  await page.getByRole("button", { name: "START" }).click()
  await expectTimerRunning(page)
  await expect
    .poll(
      async () =>
        parseDisplayTextToSeconds(
          (await getFloatingTimerState(page))?.displayText ?? "",
        ),
      {
        message: "floating timer should reflect live timer countdown",
        timeout: 5_000,
      },
    )
    .toBeLessThan(initialFloatingSeconds ?? 0)

  await openSettingsOverlay(page)
  await updateTimerSettings(page, {
    backgroundColor: "#123456",
    title: "Floating title",
  })

  await expect
    .poll(() => getFloatingTimerState(page), {
      message: "floating timer should reflect title and color updates",
    })
    .toMatchObject({
      backgroundColor: "rgb(18, 52, 86)",
    })
  await expect
    .poll(async () => (await getFloatingTimerState(page))?.rootText ?? "")
    .toContain("Floating title")

  await page.getByTestId("floating-timer-toggle").click()
  await expect(page.getByTestId("floating-timer-toggle")).not.toBeChecked()
  await expectFloatingTimerClosed(page)
})
