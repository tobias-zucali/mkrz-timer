import { expect, test } from "@playwright/test"

import {
  closeSettingsOverlay,
  expectTimerSettings,
  expectTimerUrlParams,
  expectUrlQrCode,
  openSettingsOverlay,
  openTimer,
  updateTimerSettings,
} from "./remote-mode.helpers"

test(
  "opens and closes the timer URL QR overlay",
  { tag: "@smoke" },
  async ({ page }) => {
    await openTimer(page, 3)
    await openSettingsOverlay(page)

    await page.getByRole("button", { name: "Show Share Link" }).click()
    const qrCodeDialog = page.getByRole("dialog", { name: "Share Link" })

    await expect(qrCodeDialog).toBeVisible()
    await expect(
      qrCodeDialog.getByRole("heading", { name: "Share Link" }),
    ).toBeVisible()
    await expect(
      qrCodeDialog.getByRole("img", { name: "Share Link" }),
    ).toBeVisible()
    await expect(qrCodeDialog).toContainText("m=00")
    await expect(qrCodeDialog).toContainText("s=03")

    await qrCodeDialog.click()

    await expect(qrCodeDialog).not.toBeVisible()
    await expect(page.getByRole("textbox", { name: "Share Link" })).toBeVisible()
  },
)

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
    await expectUrlQrCode(page, "Share Link")
    await updateTimerSettings(page, settings)
    await closeSettingsOverlay(page)

    await expectTimerSettings(page, settings)
    await expectTimerUrlParams(page, settings)
  },
)

test("keeps timer shortcuts local to the settings drawer", async ({ page }) => {
  await openTimer(page, 3)
  await openSettingsOverlay(page)

  await page.getByLabel("Title").press(" ")
  await expect(page.getByRole("button", { name: "START" })).toBeVisible()

  await page.getByLabel("Title").press("Escape")
  await expect(page.getByTestId("settings-drawer")).not.toBeVisible()
  await expect(page.getByRole("button", { name: "START" })).toBeVisible()
})
