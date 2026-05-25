import assert from "node:assert/strict"
import test from "node:test"

import {
  getTimerTitleFontClassName,
  getTimerTitleLayoutConfig,
  LONG_TIMER_TITLE_LENGTH,
} from "./index.ts"

test("returns the main timer title class config", () => {
  const layout = getTimerTitleLayoutConfig()

  assert.deepEqual(layout, {
    lineHeight: 0.94,
    maxVisibleLines: 4,
  })
})

test("uses the long-title class bucket only above the length threshold", () => {
  assert.equal(
    getTimerTitleFontClassName({
      text: "x".repeat(LONG_TIMER_TITLE_LENGTH),
    }),
    "text-5xl sm:text-6xl md:text-7xl",
  )

  assert.equal(
    getTimerTitleFontClassName({
      text: "x".repeat(LONG_TIMER_TITLE_LENGTH + 1),
      variant: "floating",
    }),
    "text-2xl sm:text-3xl md:text-4xl",
  )
})
