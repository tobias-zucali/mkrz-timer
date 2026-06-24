import assert from "node:assert/strict"
import { test } from "vitest"

import { buildDocumentTitle } from "./index.ts"

test("buildDocumentTitle includes the page title when present", () => {
  assert.equal(
    buildDocumentTitle({
      appTitle: "mkrz timer",
      pageTitle: "Workshop timer",
    }),
    "Workshop timer - mkrz timer",
  )
})

test("buildDocumentTitle falls back to the app title when the page title is empty", () => {
  assert.equal(
    buildDocumentTitle({
      appTitle: "mkrz timer",
      pageTitle: "",
    }),
    "mkrz timer",
  )
})
