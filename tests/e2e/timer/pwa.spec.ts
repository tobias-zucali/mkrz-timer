import { getDisplayedSeconds, openTimer } from "../support/helpers"
import { expect, test } from "../support/test"

test("exposes install metadata and reloads offline after service worker setup", async ({
  baseURL,
  context,
  page,
}) => {
  const appBaseUrl = baseURL ?? "http://127.0.0.1:3200"

  test.skip(
    appBaseUrl !== "http://127.0.0.1:3200",
    "This check requires the exported app and static server.",
  )

  await openTimer(page, 3, appBaseUrl)

  const manifestLink = page.locator('link[rel="manifest"]')
  await expect(manifestLink).toHaveAttribute("href", "/manifest.webmanifest")

  const manifestHref = await manifestLink.getAttribute("href")
  const manifestUrl = new URL(
    manifestHref ?? "/manifest.webmanifest",
    appBaseUrl,
  )

  const manifest = await page.evaluate(async (url) => {
    const response = await fetch(url)
    return response.json()
  }, manifestUrl.toString())

  const swPrecacheManifest = await page.evaluate(async () => {
    const response = await fetch("/sw-precache-manifest.js")
    return response.text()
  })

  expect(manifest).toMatchObject({
    id: "/",
    background_color: "#dddddd",
    description: "An accessible presentation timer with live sharing controls.",
    display: "standalone",
    name: "mkrz timer",
    orientation: "portrait",
    scope: "/",
    short_name: "timer",
    start_url: "/",
    theme_color: "#dddddd",
  })
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      }),
      expect.objectContaining({
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      }),
    ]),
  )
  expect(swPrecacheManifest).toContain('"/"')
  expect(swPrecacheManifest).toContain('"/en"')
  expect(swPrecacheManifest).toContain('"/manifest.webmanifest"')

  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/apple-touch-icon.png",
  )
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#dddddd",
  )

  const registration = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) {
      return null
    }

    const ready = await navigator.serviceWorker.ready

    return {
      scope: ready.scope,
      scriptURL: ready.active?.scriptURL ?? null,
    }
  })

  expect(registration).toEqual({
    scope: `${appBaseUrl}/`,
    scriptURL: `${appBaseUrl}/sw.js`,
  })

  await page.reload()
  await context.setOffline(true)
  await page.reload()

  await expect(page.getByRole("button", { name: "START" })).toBeVisible()
  await expect(getDisplayedSeconds(page)).resolves.toBe(3)

  await context.setOffline(false)
})
