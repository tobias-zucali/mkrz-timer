import assert from "node:assert/strict"
import { test } from "vitest"

import {
  getMinutesSeconds,
  getSecondsDuration,
  normalizeTimeParts,
  parseIntSafe,
  prefixZeros,
} from "./index.ts"

test("parseIntSafe falls back to zero for invalid values", () => {
  assert.equal(parseIntSafe(1), 1)
  assert.equal(parseIntSafe(NaN), 0)
  assert.equal(parseIntSafe("99"), 99)
  assert.equal(parseIntSafe("abc"), 0)
})

test("prefixZeros pads absolute values while preserving negative sign", () => {
  assert.equal(prefixZeros(1), "01")
  assert.equal(prefixZeros(NaN), "00")
  assert.equal(prefixZeros(99), "99")
  assert.equal(prefixZeros(999), "999")
  assert.equal(prefixZeros(-1), "-01")
})

test("getSecondsDuration combines minutes and seconds", () => {
  assert.equal(getSecondsDuration("", ""), 0)
  assert.equal(getSecondsDuration("1", "1"), 61)
  assert.equal(getSecondsDuration("10", "99"), 699)
  assert.equal(getSecondsDuration("00", "01"), 1)
  assert.equal(getSecondsDuration("00", "59"), 59)
  assert.equal(getSecondsDuration("01", "00"), 60)
  assert.equal(getSecondsDuration("01", "01"), 61)
  assert.equal(getSecondsDuration("01", "59"), 119)
  assert.equal(getSecondsDuration("02", "00"), 120)
  assert.equal(getSecondsDuration("02", "01"), 121)
  assert.equal(getSecondsDuration("02", "03"), 123)
})

test("getMinutesSeconds rounds up and formats duration parts", () => {
  assert.deepEqual(getMinutesSeconds(1), ["00", "01"])
  assert.deepEqual(getMinutesSeconds(59), ["00", "59"])
  assert.deepEqual(getMinutesSeconds(59.1), ["01", "00"])
  assert.deepEqual(getMinutesSeconds(59.9), ["01", "00"])
  assert.deepEqual(getMinutesSeconds(60), ["01", "00"])
  assert.deepEqual(getMinutesSeconds(60.1), ["01", "01"])
  assert.deepEqual(getMinutesSeconds(61), ["01", "01"])
  assert.deepEqual(getMinutesSeconds(119), ["01", "59"])
  assert.deepEqual(getMinutesSeconds(120), ["02", "00"])
  assert.deepEqual(getMinutesSeconds(121), ["02", "01"])
  assert.deepEqual(getMinutesSeconds(123), ["02", "03"])
  assert.deepEqual(getMinutesSeconds(0.1), ["00", "01"])
  assert.deepEqual(getMinutesSeconds(0), ["00", "00"])
  assert.deepEqual(getMinutesSeconds(-0.1), ["00", "00"])
  assert.deepEqual(getMinutesSeconds(-0.9), ["00", "00"])
  assert.deepEqual(getMinutesSeconds(-1), ["-00", "01"])
  assert.deepEqual(getMinutesSeconds(-1.1), ["-00", "01"])
})

test("getMinutesSeconds can freeze small negative durations at zero", () => {
  assert.deepEqual(getMinutesSeconds(1, 10), ["00", "01"])
  assert.deepEqual(getMinutesSeconds(-1, 10), ["00", "00"])
  assert.deepEqual(getMinutesSeconds(9, 10), ["00", "09"])
  assert.deepEqual(getMinutesSeconds(-9, 10), ["00", "00"])
  assert.deepEqual(getMinutesSeconds(10, 10), ["00", "10"])
  assert.deepEqual(getMinutesSeconds(-10, 10), ["-00", "10"])
})

test("normalizeTimeParts carries overflow seconds into minutes deterministically", () => {
  assert.deepEqual(normalizeTimeParts({ minutes: "1", seconds: "90" }), {
    minutes: "02",
    seconds: "30",
    totalSeconds: 150,
  })
  assert.deepEqual(normalizeTimeParts({ minutes: "0", seconds: "75" }), {
    minutes: "01",
    seconds: "15",
    totalSeconds: 75,
  })
  assert.deepEqual(normalizeTimeParts({ minutes: "90", seconds: "0" }), {
    minutes: "90",
    seconds: "00",
    totalSeconds: 5400,
  })
})
