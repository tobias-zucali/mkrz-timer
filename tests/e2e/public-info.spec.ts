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
