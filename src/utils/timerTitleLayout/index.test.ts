import assert from "node:assert/strict"
import test from "node:test"

import {
  getTimerTitleFontStyle,
  getTimerTitleBoxStyle,
  LONG_TIMER_TITLE_LENGTH,
} from "./index.ts"

test("returns unclamped title box sizing", () => {
  const boxStyle = getTimerTitleBoxStyle()

  assert.equal(boxStyle.lineHeight, 0.94)
  assert.equal(boxStyle.minHeight, "1.2999999999999998em")
  assert.ok(!("maxHeight" in boxStyle))
})

test("uses the long-title font bucket only above the length threshold", () => {
  assert.equal(
    getTimerTitleFontStyle({
      text: "x".repeat(LONG_TIMER_TITLE_LENGTH),
    }).fontSize,
    "clamp(2.4rem, min(6.8vw, 6.8vh), 4.5rem)",
  )

  assert.equal(
    getTimerTitleFontStyle({
      text: "x".repeat(LONG_TIMER_TITLE_LENGTH + 1),
    }).fontSize,
    "clamp(2rem, min(5.8vw, 5.8vh), 3.75rem)",
  )
})
