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

    await page.getByRole("button", { name: "Show Timer URL" }).click()
    const qrCodeDialog = page.getByRole("dialog", { name: "Timer URL" })

    await expect(qrCodeDialog).toBeVisible()
    await expect(
      qrCodeDialog.getByRole("heading", { name: "Timer URL" }),
    ).toBeVisible()
    await expect(
      qrCodeDialog.getByRole("img", { name: "Timer URL" }),
    ).toBeVisible()
    await expect(qrCodeDialog).toContainText("m=00")
    await expect(qrCodeDialog).toContainText("s=03")
    await expect(qrCodeDialog).not.toContainText("settings=true")

    await qrCodeDialog.click()

    await expect(qrCodeDialog).not.toBeVisible()
    await expect(page.getByRole("textbox", { name: "Timer URL" })).toBeVisible()
    await expect(
      page.getByRole("textbox", { name: "Timer URL" }),
    ).not.toHaveValue(/settings=true/)
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
    await expectUrlQrCode(page, "Timer URL")
    await updateTimerSettings(page, settings)
    await closeSettingsOverlay(page)

    await expectTimerSettings(page, settings)
    await expectTimerUrlParams(page, settings)
  },
)
