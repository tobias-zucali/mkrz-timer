import { expect, Page, test } from "@playwright/test"

import {
  closeSettingsOverlay,
  expectScreenshotWithoutDebugInfo,
  expectTimerRunning,
  openSidebarPanel,
  openSettingsOverlay,
  openTimer,
  updateTimerSettings,
} from "./remote-mode.helpers"

function getFloatingTimerToggle(page: Page) {
  return page.getByRole("button", {
    name: /Open floating timer|Floating timer open/,
  })
}

async function openFloatingTimer(page: Page) {
  const toggle = getFloatingTimerToggle(page)
  await expect(toggle).toBeVisible()
  await expect(toggle).toBeEnabled()
  await expect(toggle).toHaveAccessibleName("Open floating timer")

  const pipPromise = page.context().waitForEvent("page")
  await toggle.click()
  await expect(toggle).toHaveAccessibleName("Floating timer open")
  const pipPage = await pipPromise
  await pipPage.waitForLoadState("domcontentloaded")
  return pipPage
}

async function closeFloatingTimer(page: Page) {
  const toggle = getFloatingTimerToggle(page)
  await expect(toggle).toBeVisible()
  await expect(toggle).toBeEnabled()
  await expect(toggle).toHaveAccessibleName("Floating timer open")

  await toggle.click()
  await expect(toggle).toHaveAccessibleName("Open floating timer")
  await expectFloatingTimerClosed(page)
}

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

    const title = pipWindow.document.querySelector(
      '[data-testid="floating-timer-title"]',
    )
    const display = pipWindow.document.querySelector(
      '[data-testid="floating-timer-display"]',
    )

    return {
      backgroundColor: getComputedStyle(pipWindow.document.body)
        .backgroundColor,
      displayText: display?.textContent?.replace(/\s+/g, " ").trim() || "",
      hasButtons: pipWindow.document.querySelectorAll("button").length,
      titleText: title?.textContent?.replace(/\s+/g, " ").trim() || "",
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
  await openSidebarPanel(page, "Settings")

  await expect(
    page.getByRole("button", { name: "Open floating timer" }),
  ).toBeVisible()
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
  await openSidebarPanel(page, "Settings")

  await expect(
    page.getByRole("button", { name: "Open floating timer" }),
  ).toBeDisabled()
  await expect(page.getByText(/document picture-in-picture/i)).toBeVisible()
})

// Test focusing on sync
test("opens a readonly floating timer in local mode and keeps it synced", async ({
  page,
}) => {
  await openTimer(page, 3)
  await openSidebarPanel(page, "Settings")
  const pipPage = await openFloatingTimer(page)
  await expect(pipPage.locator("body")).toMatchAriaSnapshot({
    name: "floating-timer-screen.aria.yml",
  })

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

  await page.getByRole("button", { name: "RESET" }).click()
  await openSettingsOverlay(page)
  await updateTimerSettings(page, {
    backgroundColor: "#123456",
    title: "Floating title",
    minutes: "12",
    seconds: "34",
  })

  await expect
    .poll(() => getFloatingTimerState(page), {
      message: "floating timer should reflect title and color updates",
    })
    .toMatchObject({
      backgroundColor: "rgb(18, 52, 86)",
      displayText: "12:34",
      titleText: "Floating title",
    })

  await page.getByRole("button", { name: "Floating timer open" }).click()
  await expect(
    page.getByRole("button", { name: "Open floating timer" }),
  ).toBeVisible()
  await expectFloatingTimerClosed(page)
})

// Test focusing on snapshots with multiple sizes
const snapshotSizes = [
  { width: 300, height: 200 },
  { width: 520, height: 520 },
  { width: 1024, height: 768 },
]

test(
  "captures snapshots of floating timer in multiple sizes",
  { tag: "@visual" },
  async ({ page }) => {
    await openTimer(page, 3)
    await openSidebarPanel(page, "Settings")
    await updateTimerSettings(page, {
      backgroundColor: "#123456",
      title: "Floating title",
      minutes: "12",
      seconds: "34",
    })
    const pipPage = await openFloatingTimer(page)

    for (const size of snapshotSizes) {
      await pipPage.setViewportSize(size)
      await expectScreenshotWithoutDebugInfo(pipPage, {
        fullPage: true,
        message: `PiP layout should stay visually stable at ${size.width}x${size.height}`,
        name: `PiP-layout-${size.width}x${size.height}.png`,
      })
    }

    await closeFloatingTimer(page)
  },
)
