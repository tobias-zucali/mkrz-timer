import { test } from "vitest"
import assert from "node:assert/strict"

import { formatBuildId, getBuildId } from "./buildInfo.ts"

test("getBuildId falls back to dev when the value is missing", () => {
  assert.equal(getBuildId(undefined), "dev")
  assert.equal(getBuildId(""), "dev")
  assert.equal(getBuildId("   "), "dev")
})

test("getBuildId returns the normalized commit value", () => {
  assert.equal(getBuildId("  abcdef123456  "), "abcdef123456")
})

test("formatBuildId shortens commit-like values for display", () => {
  assert.equal(formatBuildId("1234567890abcdef"), "1234567890ab")
  assert.equal(formatBuildId("dev"), "dev")
})
