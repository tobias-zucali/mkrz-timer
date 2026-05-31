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
} from "./remote-mode.helpers"

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

  const sidebarBounds = await offcanvas.boundingBox()
  expect(sidebarBounds?.width).toBeLessThan(viewportSize?.width ?? Infinity)
  expect(sidebarBounds?.height).toBe(viewportSize?.height)

  await page
    .locator(
      '[data-testid="sidebar-panel-timer"] button[title="Close sidebar"]',
    )
    .press(" ")
  await expect(
    page.getByTestId("timer-controls").getByRole("button", { name: "START" }),
  ).toBeVisible()
  await expect(timerPanel).toBeVisible()

  await openSidebarPanel(page, "Share")
  await offcanvas.getByRole("button", { name: "Timer" }).press(" ")
  await expect(page.getByTestId("sidebar-panel-share")).toBeVisible()
  await expect(
    page.getByTestId("timer-controls").getByRole("button", { name: "START" }),
  ).toBeVisible()
  await expect(
    page.getByTestId("timer-controls").getByRole("button", { name: "RESET" }),
  ).toBeEnabled()
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
