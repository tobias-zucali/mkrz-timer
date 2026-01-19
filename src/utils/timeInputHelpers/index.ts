export const parseIntSafe = (value: string | number) => {
  const intValue = typeof value === "number" ? value : parseInt(value)
  return isNaN(intValue) ? 0 : intValue
}

export const prefixZeros = (value: string | number) => {
  const numberValue = parseIntSafe(value)
  const isNegative = numberValue < 0
  const absValue = isNegative ? numberValue * -1 : numberValue
  let prefixedValue = `${absValue}`
  while (prefixedValue.length < 2) {
    prefixedValue = `0${prefixedValue}`
  }
  return isNegative ? `-${prefixedValue}` : prefixedValue
}

export const getSecondsDuration = (minutes: string, seconds: string) =>
  parseIntSafe(minutes) * 60 + parseIntSafe(seconds)

export const getMinutesSeconds = (
  secondsDuration: number,
  negativeFreezeSeconds: number = 0,
) => {
  const secondsDurationRounded = Math.ceil(secondsDuration)
  const isNegative = secondsDurationRounded < 0
  const secondsDurationRoundedAbs = isNegative
    ? secondsDurationRounded * -1
    : secondsDurationRounded
  if (
    isNegative &&
    negativeFreezeSeconds > 0 &&
    secondsDurationRoundedAbs < negativeFreezeSeconds
  ) {
    return ["00", "00"]
  }

  const seconds = secondsDurationRoundedAbs % 60
  const minutes = (secondsDurationRoundedAbs - seconds) / 60
  return [
    `${isNegative ? "-" : ""}${prefixZeros(minutes)}`,
    prefixZeros(seconds),
  ]
}
