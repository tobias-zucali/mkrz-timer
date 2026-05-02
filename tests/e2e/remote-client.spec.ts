import { expect, test } from "@playwright/test"

import {
  closeSettingsOverlay,
  enableRemoteMode,
  openClientFromSettings,
} from "./remote-mode.helpers"

test("opens settings, enables remote mode, and opens a client timer", async ({
  page,
}) => {
  const clientUrl = await enableRemoteMode(page)
  await openClientFromSettings(page, clientUrl)
  await closeSettingsOverlay(page)
  await expect(page.getByRole("button", { name: "START" })).toBeVisible()
})
