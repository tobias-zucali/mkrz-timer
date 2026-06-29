import { devices } from "@playwright/test"

import { expectScreenshotWithoutDebugInfo } from "./support/helpers"
import { expect, installE2eBrowserMocks, test } from "./support/test"

test.describe.configure({ mode: "serial" })

const homePageViewports = [
  {
    name: "mobile",
    contextOptions: { ...devices["iPhone SE"] },
  },
  {
    name: "tablet",
    contextOptions: { ...devices["iPad Mini"] },
  },
  {
    name: "desktop",
    contextOptions: { viewport: { width: 1280, height: 900 } },
  },
] as const

const homePageLocales = ["en", "de"] as const

test(
  "matches home page layout across viewports",
  { tag: "@visual" },
  async ({ baseURL, browser }) => {
    test.slow()

    for (const locale of homePageLocales) {
      for (const { name, contextOptions } of homePageViewports) {
        const context = await browser.newContext(contextOptions)
        await installE2eBrowserMocks(context)
        const devicePage = await context.newPage()

        await devicePage.goto(
          baseURL
            ? new URL(`/${locale}`, baseURL).toString()
            : `/${locale}`,
        )
        await expect(
          devicePage.getByRole("heading", { level: 1 }),
        ).toBeVisible({ timeout: 15_000 })

        await expectScreenshotWithoutDebugInfo(devicePage, {
          fullPage: true,
          message: `home page ${locale} ${name} layout should stay visually stable`,
          name: `home-layout-${locale}-${name}.png`,
        })

        await context.close()
      }
    }
  },
)

const infoPages = [
  { slug: "about", title: "About mkrz timer" },
  { slug: "privacy", title: "Privacy" },
  { slug: "impressum", title: "Impressum" },
  { slug: "terms", title: "Terms" },
  { slug: "accessibility", title: "Accessibility" },
  { slug: "contact", title: "Contact" },
] as const

for (const pageDefinition of infoPages) {
  test(`renders the ${pageDefinition.slug} info page`, async ({ page }) => {
    await page.goto(`/en/${pageDefinition.slug}`)

    await expect(
      page.getByRole("heading", { level: 1, name: pageDefinition.title }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.locator("main")).toMatchAriaSnapshot({
      name: `public-info-${pageDefinition.slug}.aria.yml`,
    })
  })
}

test("keeps footer navigation available on public info pages", async ({
  page,
}) => {
  await page.goto("/en/contact")

  const footer = page.getByRole("navigation", { name: "Information pages" })
  await expect(footer).toBeVisible()

  for (const linkName of [
    "About",
    "Privacy",
    "Impressum",
    "Terms",
    "Accessibility",
    "Contact",
  ]) {
    await expect(footer.getByRole("link", { name: linkName })).toBeVisible()
  }

  await expect(footer.getByRole("link", { name: "GitHub" })).toHaveCount(0)

  await expect(
    page.getByRole("link", { name: "mkrz lab" }).first(),
  ).toHaveAttribute("target", "_blank")
})

test("shows translated content on the German about page", async ({ page }) => {
  await page.goto("/de/about")

  await expect(
    page.getByRole("heading", { level: 1, name: "Über mkrz timer" }),
  ).toBeVisible()
  await expect(
    page.getByText(
      "Diese Seite verwendet derzeit englische Inhalte als Fallback.",
    ),
  ).toHaveCount(0)
})

test("keeps the privacy page aligned with token-based live sessions", async ({
  page,
}) => {
  await page.goto("/en/privacy")

  await expect(page.getByText("join and manage tokens")).toBeVisible()
  await expect(page.locator("main")).not.toContainText("email")
})
