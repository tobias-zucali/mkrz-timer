import assert from "node:assert/strict"
import test from "node:test"

import { getTimerTitleLayout } from "./index.ts"

test("uses the largest title size when the title is short", () => {
  const layout = getTimerTitleLayout("Sprint")

  assert.equal(layout.hasText, true)
  assert.equal(layout.fontSizeRem, 5)
  assert.equal(layout.lineCount, 1)
})

test("reduces the main timer font size for longer multiline titles", () => {
  const shortTitleLayout = getTimerTitleLayout("Sprint")
  const longTitleLayout = getTimerTitleLayout(
    "Quarterly planning\nretrospective and facilitator notes",
  )

  assert.equal(longTitleLayout.lineCount, 2)
  assert.ok(longTitleLayout.fontSizeRem < shortTitleLayout.fontSizeRem)
  assert.ok(longTitleLayout.fontSizeRem >= 1.75)
})

test("keeps floating titles on a smaller scale than the main timer", () => {
  const mainLayout = getTimerTitleLayout("Workshop agenda")
  const floatingLayout = getTimerTitleLayout("Workshop agenda", "floating")

  assert.ok(floatingLayout.fontSizeRem < mainLayout.fontSizeRem)
  assert.equal(floatingLayout.maxVisibleLines, 3)
})

test("increases main title size on wider viewports", () => {
  const title = "Quarterly planning\nfacilitator notes"
  const narrowLayout = getTimerTitleLayout(title, "main", {
    viewportWidthPx: 820,
  })
  const wideLayout = getTimerTitleLayout(title, "main", {
    viewportWidthPx: 1440,
  })

  assert.ok(wideLayout.fontSizeRem > narrowLayout.fontSizeRem)
})

test("treats empty titles as having no rendered text", () => {
  const layout = getTimerTitleLayout("   ")

  assert.equal(layout.hasText, false)
  assert.equal(layout.lineCount, 0)
})
