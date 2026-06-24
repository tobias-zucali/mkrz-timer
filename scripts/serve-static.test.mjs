import assert from "node:assert/strict"
import { test } from "vitest"

import { getRemoteFallbackPath } from "./serve-static.mjs"

test("maps unlocalized live session URLs to the exported fallback pages", () => {
  assert.equal(getRemoteFallbackPath("/view/viewer-token"), "/view")
  assert.equal(getRemoteFallbackPath("/control/control-token"), "/control")
})

test("maps localized live session URLs to the matching exported locale pages", () => {
  assert.equal(getRemoteFallbackPath("/de/view/viewer-token"), "/de/view")
  assert.equal(
    getRemoteFallbackPath("/en/control/control-token"),
    "/en/control",
  )
})

test("ignores non-live-session URLs", () => {
  assert.equal(getRemoteFallbackPath("/de/settings"), null)
  assert.equal(getRemoteFallbackPath("/"), null)
})
