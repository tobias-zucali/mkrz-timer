import assert from "node:assert/strict"
import { test } from "node:test"

import { defaultAppLocale } from "./config.ts"
import { resolveAppLocale } from "./locale.ts"

test("resolveAppLocale returns the default locale when missing", () => {
  assert.equal(resolveAppLocale(), defaultAppLocale)
  assert.equal(resolveAppLocale(null), defaultAppLocale)
})

test("resolveAppLocale accepts exact and region-specific matches", () => {
  assert.equal(resolveAppLocale("en"), "en")
  assert.equal(resolveAppLocale("en-US"), "en")
  assert.equal(resolveAppLocale("EN-gb"), "en")
})

test("resolveAppLocale falls back for unsupported locales", () => {
  assert.equal(resolveAppLocale("de"), defaultAppLocale)
})
