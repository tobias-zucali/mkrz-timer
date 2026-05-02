import { expect, Page } from "@playwright/test"

const timerUrl = "/?m=01&s=00&bg=%23000000&fg=%23ffffff&pc=%23d61f69"

export async function enableRemoteMode(page: Page) {
  await page.goto(timerUrl)

  await page.getByRole("button", { name: "Settings" }).click()
  await expect(
    page.getByRole("button", { name: "Switch to remote mode" }),
  ).toBeVisible()

  await page.getByRole("button", { name: "Switch to remote mode" }).click()

  const clientUrlInput = page.getByLabel("Client URL")
  await expect(clientUrlInput).toBeVisible()
  await expect
    .poll(() => clientUrlInput.inputValue(), {
      message: "client URL should include a remote peer id",
    })
    .toContain("?rid=")

  return clientUrlInput.inputValue()
}

export async function openClientFromSettings(page: Page, clientUrl: string) {
  const clientPagePromise = page.waitForEvent("popup")
  await page.getByRole("link", { name: "Open" }).click()
  const clientPage = await clientPagePromise

  await expect(clientPage).toHaveURL(clientUrl)
  await expect(clientPage.getByRole("button", { name: "START" })).toBeVisible()
  await expect(clientPage).toHaveURL(/rid=/)
  return clientPage
}

export async function expectTimerRunning(page: Page) {
  await expect(page.getByRole("button", { name: "PAUSE" })).toBeVisible({
    timeout: 15_000,
  })

  const initialSeconds = await getDisplayedSeconds(page)
  await expect
    .poll(() => getDisplayedSeconds(page), {
      message: "timer should count down while running",
      timeout: 5_000,
    })
    .toBeLessThan(initialSeconds)
}

export async function expectTimerPaused(page: Page) {
  await expect(page.getByRole("button", { name: "START" })).toBeVisible({
    timeout: 15_000,
  })
}

export async function getDisplayedSeconds(page: Page) {
  const minutes = Number(await page.getByLabel("Minutes").inputValue())
  const seconds = Number(await page.getByLabel("Seconds").inputValue())

  return minutes * 60 + seconds
}
