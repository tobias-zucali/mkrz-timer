import { devices, expect, test } from "@playwright/test"

import {
  closeSettingsOverlay,
  expectScreenshotWithoutDebugInfo,
  expectTimerSettings,
  expectTimerUrlParams,
  expectUrlQrCode,
  openSidebarPanel,
  openSettingsOverlay,
  openTimer,
  updateTimerSettings,
} from "./live-session.helpers"

const sidebarVisualScenarios = [
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

test(
  "opens and closes the timer URL QR overlay",
  { tag: "@smoke" },
  async ({ page }) => {
    await openTimer(page, 3)
    await openSidebarPanel(page, "Share")

    await page.getByRole("button", { name: "Show Local link" }).click()
    const qrCodeDialog = page.getByRole("dialog", {
      name: "Timer · Local link",
    })

    await expect(qrCodeDialog).toBeVisible()
    await expect(qrCodeDialog).toMatchAriaSnapshot({
      name: "local-share-qr-dialog.aria.yml",
    })
    await expect(
      qrCodeDialog.getByRole("heading", { name: "Timer · Local link" }),
    ).toBeVisible()
    await expect(
      qrCodeDialog.getByRole("img", { name: "Local link" }),
    ).toBeVisible()
    await expect(qrCodeDialog).toContainText("v=1")
    await expect(qrCodeDialog).toContainText("t=3%21")
    const qrCodeBounds = await qrCodeDialog.boundingBox()
    const viewportSize = page.viewportSize()

    expect(qrCodeBounds?.width).toBe(viewportSize?.width)
    expect(qrCodeBounds?.height).toBe(viewportSize?.height)

    await qrCodeDialog.click()

    await expect(qrCodeDialog).not.toBeVisible()
    await expect(
      page.getByRole("textbox", { name: "Local link" }),
    ).toBeVisible()
  },
)

test("matches sidebar panel aria structures", async ({ page }) => {
  await openTimer(page, 3)

  await openSidebarPanel(page, "Timer")
  await expect(page.getByTestId("sidebar-panel-timer")).toMatchAriaSnapshot({
    name: "sidebar-timer-panel.aria.yml",
  })

  await openSidebarPanel(page, "Share")
  await expect(page.getByTestId("sidebar-panel-share")).toMatchAriaSnapshot({
    name: "sidebar-share-panel.aria.yml",
  })
  const localLink = new URL(
    await page.getByRole("textbox", { name: "Local link" }).inputValue(),
  )

  expect(localLink.pathname).toBe("/")
  expect(localLink.searchParams.get("v")).toBe("1")
  expect(localLink.searchParams.get("t")).toBeTruthy()
  expect(localLink.searchParams.get("a")).toBe("0")

  await openSidebarPanel(page, "Settings")
  await expect(page.getByTestId("sidebar-panel-settings")).toMatchAriaSnapshot({
    name: "sidebar-settings-panel.aria.yml",
  })
})

test(
  "updates title, duration, and colors through settings",
  { tag: "@smoke" },
  async ({ page }) => {
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
    await expectUrlQrCode(page, "Local link")
    await updateTimerSettings(page, settings)
    await closeSettingsOverlay(page)

    await expectTimerSettings(page, settings)
    await expectTimerUrlParams(page, settings)
  },
)

test("toggles shared settings in the local share link", async ({ page }) => {
  await openTimer(page, 3)

  await updateTimerSettings(page, {
    backgroundColor: "#123456",
    soundId: "b",
    ttsEnabled: true,
  })

  await openSidebarPanel(page, "Share")
  const localLink = page.getByRole("textbox", { name: "Local link" })

  await expect(localLink).toHaveValue(/(?:\?|&)bg=123456(?:&|$)/)
  await expect(localLink).toHaveValue(/(?:\?|&)s=b(?:&|$)/)
  await expect(localLink).toHaveValue(/(?:\?|&)ts=1(?:&|$)/)

  await page
    .getByRole("checkbox", {
      name: "Include Voice & Sound settings in links",
    })
    .uncheck()

  await expect(localLink).not.toHaveValue(/(?:\?|&)bg=123456(?:&|$)/)
  await expect(localLink).not.toHaveValue(/(?:\?|&)s=b(?:&|$)/)
  await expect(localLink).not.toHaveValue(/(?:\?|&)ts=1(?:&|$)/)
})

test("persists the share settings toggle across reloads", async ({ page }) => {
  await openTimer(page, 3)

  await updateTimerSettings(page, {
    backgroundColor: "#123456",
    soundId: "b",
    ttsEnabled: true,
  })

  await openSidebarPanel(page, "Share")
  const includeSettingsToggle = page.getByRole("checkbox", {
    name: "Include Voice & Sound settings in links",
  })
  const localLink = page.getByRole("textbox", { name: "Local link" })

  await includeSettingsToggle.uncheck()
  await expect(localLink).not.toHaveValue(/(?:\?|&)bg=123456(?:&|$)/)
  await expect(localLink).not.toHaveValue(/(?:\?|&)s=b(?:&|$)/)
  await expect(localLink).not.toHaveValue(/(?:\?|&)ts=1(?:&|$)/)

  await page.reload()
  await openSidebarPanel(page, "Share")

  await expect(includeSettingsToggle).not.toBeChecked()
  await expect(localLink).not.toHaveValue(/(?:\?|&)bg=123456(?:&|$)/)
  await expect(localLink).not.toHaveValue(/(?:\?|&)s=b(?:&|$)/)
  await expect(localLink).not.toHaveValue(/(?:\?|&)ts=1(?:&|$)/)
})

test("keeps timer shortcuts predictable inside the sidebar", async ({
  page,
}) => {
  await openTimer(page, 3)
  await openSettingsOverlay(page)
  const timerPanel = page.getByTestId("sidebar-panel-timer")
  const offcanvas = page.getByTestId("sidebar-offcanvas")
  const viewportSize = page.viewportSize()

  await timerPanel.getByLabel("Title").press(" ")
  await expect(page.getByRole("button", { name: "START" })).toBeVisible()
  await expect(timerPanel).toBeVisible()

  const sidebarBounds = await offcanvas.boundingBox()
  expect(sidebarBounds?.width).toBeLessThan(viewportSize?.width ?? Infinity)
  expect(sidebarBounds?.height).toBe(viewportSize?.height)

  await openSidebarPanel(page, "Share")
  await offcanvas.getByRole("button", { name: "Timer" }).press("Enter")
  await expect(page.getByTestId("sidebar-panel-timer")).toBeVisible()
  await expect(
    page.getByTestId("timer-controls").getByRole("button", { name: "START" }),
  ).toBeVisible()
  await expect(
    page.getByTestId("timer-controls").getByRole("button", { name: "RESET" }),
  ).toBeDisabled()
})

test("limits titles to 64 characters in settings", async ({ page }) => {
  await openTimer(page, 3)
  await openSettingsOverlay(page)

  const titleField = page.getByTestId("sidebar-panel-timer").getByLabel("Title")
  const longTitle = "Facilitator notes ".repeat(6)

  await titleField.fill(longTitle)

  await expect(titleField).toHaveValue(longTitle.slice(0, 64))
})

test(
  "matches sidebar menu and panel layouts on desktop and mobile",
  { tag: "@visual" },
  async ({ baseURL, browser }) => {
    test.slow()

    for (const { contextOptions, name } of sidebarVisualScenarios) {
      const context = await browser.newContext(contextOptions)
      const devicePage = await context.newPage()

      await openTimer(devicePage, 3, baseURL)
      await devicePage
        .getByRole("button", { name: "Toggle navigation" })
        .click()
      await expect(devicePage.getByTestId("sidebar-offcanvas")).toBeVisible()
      await expect(
        devicePage.getByRole("button", { exact: true, name: "Timer" }),
      ).toBeVisible()

      await expectScreenshotWithoutDebugInfo(devicePage, {
        message: `${name} sidebar menu should stay visually stable`,
        name: `sidebar-menu-${name}.png`,
      })

      await openSidebarPanel(devicePage, "Timer")
      await expect(devicePage.getByTestId("sidebar-panel-timer")).toBeVisible()

      await expectScreenshotWithoutDebugInfo(devicePage, {
        message: `${name} sidebar panel should stay visually stable`,
        name: `sidebar-panel-${name}.png`,
      })

      await context.close()
    }
  },
)
