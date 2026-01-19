import {
  parseIntSafe,
  prefixZeros,
  getSecondsDuration,
  getMinutesSeconds,
} from "."

test("parseIntSafe", () => {
  expect(parseIntSafe(1)).toBe(1)
  expect(parseIntSafe(NaN)).toBe(0)
  expect(parseIntSafe("99")).toBe(99)
  expect(parseIntSafe("abc")).toBe(0)
})

test("prefixZeros", () => {
  expect(prefixZeros(1)).toBe("01")
  expect(prefixZeros(NaN)).toBe("00")
  expect(prefixZeros(99)).toBe("99")
  expect(prefixZeros(999)).toBe("999")
  expect(prefixZeros(-1)).toBe("-01")
})

test("getSecondsDuration", () => {
  expect(getSecondsDuration("", "")).toBe(0)
  expect(getSecondsDuration("1", "1")).toBe(61)
  expect(getSecondsDuration("10", "99")).toBe(699)
  expect(getSecondsDuration("00", "01")).toBe(1)
  expect(getSecondsDuration("00", "59")).toBe(59)
  expect(getSecondsDuration("01", "00")).toBe(60)
  expect(getSecondsDuration("01", "01")).toBe(61)
  expect(getSecondsDuration("01", "59")).toBe(119)
  expect(getSecondsDuration("02", "00")).toBe(120)
  expect(getSecondsDuration("02", "01")).toBe(121)
  expect(getSecondsDuration("02", "03")).toBe(123)
})

test("getMinutesSeconds", () => {
  expect(getMinutesSeconds(1)).toEqual(["00", "01"])
  expect(getMinutesSeconds(59)).toEqual(["00", "59"])
  expect(getMinutesSeconds(59.1)).toEqual(["01", "00"])
  expect(getMinutesSeconds(59.9)).toEqual(["01", "00"])
  expect(getMinutesSeconds(60)).toEqual(["01", "00"])
  expect(getMinutesSeconds(60.1)).toEqual(["01", "01"])
  expect(getMinutesSeconds(61)).toEqual(["01", "01"])
  expect(getMinutesSeconds(119)).toEqual(["01", "59"])
  expect(getMinutesSeconds(120)).toEqual(["02", "00"])
  expect(getMinutesSeconds(121)).toEqual(["02", "01"])
  expect(getMinutesSeconds(123)).toEqual(["02", "03"])
  expect(getMinutesSeconds(0.1)).toEqual(["00", "01"])
  expect(getMinutesSeconds(0)).toEqual(["00", "00"])
  expect(getMinutesSeconds(-0.1)).toEqual(["00", "00"])
  expect(getMinutesSeconds(-0.9)).toEqual(["00", "00"])
  expect(getMinutesSeconds(-1)).toEqual(["-00", "01"])
  expect(getMinutesSeconds(-1.1)).toEqual(["-00", "01"])
})

test("getMinutesSeconds negative freeze", () => {
  expect(getMinutesSeconds(1, 10)).toEqual(["00", "01"])
  expect(getMinutesSeconds(-1, 10)).toEqual(["00", "00"])
  expect(getMinutesSeconds(9, 10)).toEqual(["00", "09"])
  expect(getMinutesSeconds(-9, 10)).toEqual(["00", "00"])
  expect(getMinutesSeconds(10, 10)).toEqual(["00", "10"])
  expect(getMinutesSeconds(-10, 10)).toEqual(["-00", "10"])
})
