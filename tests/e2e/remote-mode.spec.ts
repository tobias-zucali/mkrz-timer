import { expect, test } from "@playwright/test"

test("opens settings, enables remote mode, and opens a client timer", async ({
  page,
}) => {
  await page.goto("/?m=01&s=00&bg=%23000000&fg=%23ffffff&pc=%23d61f69")

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

  const clientUrl = await clientUrlInput.inputValue()
  const clientPagePromise = page.waitForEvent("popup")
  await page.getByRole("link", { name: "Open" }).click()
  const clientPage = await clientPagePromise

  await expect(clientPage).toHaveURL(clientUrl)
  await expect(clientPage.getByRole("button", { name: "START" })).toBeVisible()
  await expect(clientPage).toHaveURL(/rid=/)
})
