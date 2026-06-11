import assert from "node:assert/strict"
import { test } from "node:test"

import { defaultAppLocale } from "./config.ts"
import {
  getBrowserLocale,
  getPathLocale,
  localizePathname,
  resolveAppLocale,
  resolvePreferredAppLocale,
  stripLocalePrefix,
} from "./locale.ts"

test("resolveAppLocale returns the default locale when missing", () => {
  assert.equal(resolveAppLocale(), defaultAppLocale)
  assert.equal(resolveAppLocale(null), defaultAppLocale)
})

test("resolveAppLocale accepts exact and region-specific matches", () => {
  assert.equal(resolveAppLocale("en"), "en")
  assert.equal(resolveAppLocale("en-US"), "en")
  assert.equal(resolveAppLocale("EN-gb"), "en")
  assert.equal(resolveAppLocale("de"), "de")
  assert.equal(resolveAppLocale("de-AT"), "de")
})

test("resolveAppLocale falls back for unsupported locales", () => {
  assert.equal(resolveAppLocale("fr"), defaultAppLocale)
})

test("resolvePreferredAppLocale returns the first supported browser locale", () => {
  assert.equal(resolvePreferredAppLocale(["fr-FR", "de-AT"], "en-US"), "de")
})

test("resolvePreferredAppLocale falls back when no browser locale is supported", () => {
  assert.equal(resolvePreferredAppLocale(["fr-FR"], "it-IT"), defaultAppLocale)
})

test("getPathLocale detects supported locale prefixes only", () => {
  assert.equal(getPathLocale("/en/control/token"), "en")
  assert.equal(getPathLocale("/de/view/token"), "de")
  assert.equal(getPathLocale("/view/token"), null)
  assert.equal(getPathLocale("/fr"), null)
})

test("stripLocalePrefix keeps non-localized paths unchanged", () => {
  assert.equal(stripLocalePrefix("/de/control/token"), "/control/token")
  assert.equal(stripLocalePrefix("/en"), "/")
  assert.equal(stripLocalePrefix("/view/token"), "/view/token")
})

test("localizePathname replaces or adds the locale prefix", () => {
  assert.equal(localizePathname("/view/token", "en"), "/en/view/token")
  assert.equal(localizePathname("/de/view/token", "en"), "/en/view/token")
  assert.equal(localizePathname("/", "de"), "/de")
})

test("getBrowserLocale falls back server-side", () => {
  assert.equal(getBrowserLocale(), defaultAppLocale)
})
