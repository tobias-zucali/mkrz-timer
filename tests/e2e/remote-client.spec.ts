import { test } from "@playwright/test"

import { enableRemoteMode, openClientFromSettings } from "./remote-mode.helpers"

test("opens settings, enables remote mode, and opens a client timer", async ({
  page,
}) => {
  const clientUrl = await enableRemoteMode(page)
  await openClientFromSettings(page, clientUrl)
})
