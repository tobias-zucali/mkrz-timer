import { expect, test } from "./support/test"

test.describe.configure({ mode: "serial" })

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
    "GitHub",
  ]) {
    await expect(footer.getByRole("link", { name: linkName })).toBeVisible()
  }

  await expect(footer.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/tobias-zucali/mkrz-timer",
  )
  await expect(
    page.getByRole("link", { name: "mkrz lab" }).first(),
  ).toHaveAttribute("target", "_blank")
})

test("shows the explicit English fallback for untranslated locales", async ({
  page,
}) => {
  await page.goto("/de/about")

  await expect(
    page.getByText("This page currently falls back to English content."),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { level: 1, name: "About mkrz timer" }),
  ).toBeVisible()
})

test("keeps the privacy page aligned with token-based live sessions", async ({
  page,
}) => {
  await page.goto("/en/privacy")

  await expect(page.getByText("generated session id")).toBeVisible()
  await expect(page.getByText("generated control token")).toBeVisible()
  await expect(page.getByText("generated readonly token")).toBeVisible()
  await expect(
    page.getByText("verified email address as the session key"),
  ).toBeVisible()
  await expect(page.locator("main")).not.toContainText(
    "verified email address where it is entered or verified",
  )
})
