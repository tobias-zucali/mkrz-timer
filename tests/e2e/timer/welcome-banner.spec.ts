import { expect, test } from "../support/test"

const WELCOME_STORAGE_KEY = "timer.welcomeBanner.v1.dismissed"

test("shows the welcome dialog on a first visit and matches its aria structure", async ({
  page,
}) => {
  await page.goto("/en")

  const welcomeDialog = page.getByRole("dialog", {
    name: "Welcome to mkrz timer",
  })

  await expect(welcomeDialog).toBeVisible()
  await expect(welcomeDialog).toMatchAriaSnapshot({
    name: "welcome-dialog.aria.yml",
  })
})

test("does not show the welcome dialog for shared and remote routes", async ({
  page,
}) => {
  test.setTimeout(60_000)

  await page.goto("/en?v=1&t=60%21d61f69%21shared%211%210&a=0")
  await expect(
    page.getByRole("dialog", { name: "Welcome to mkrz timer" }),
  ).toHaveCount(0)

  await page.goto("/en/view/viewer-token")
  await expect(
    page.getByRole("dialog", { name: "Welcome to mkrz timer" }),
  ).toHaveCount(0)

  await page.goto("/en/control/control-token")
  await expect(
    page.getByRole("dialog", { name: "Welcome to mkrz timer" }),
  ).toHaveCount(0)
})

test("only persists dismissal when the explicit checkbox is enabled", async ({
  page,
}) => {
  await page.goto("/en")

  const welcomeDialog = page.getByRole("dialog", {
    name: "Welcome to mkrz timer",
  })

  await welcomeDialog.getByRole("button", { name: "Use the timer!" }).click()
  await expect(welcomeDialog).toHaveCount(0)

  await page.reload()
  await expect(welcomeDialog).toBeVisible()

  await welcomeDialog
    .getByRole("checkbox", {
      name: "Don't show this welcome again on this device.",
    })
    .check()
  await welcomeDialog.getByRole("button", { name: "Use the timer!" }).click()

  await expect
    .poll(() =>
      page.evaluate(
        (key) => window.localStorage.getItem(key),
        WELCOME_STORAGE_KEY,
      ),
    )
    .toBe("1")

  await page.reload()
  await expect(welcomeDialog).toHaveCount(0)
})
