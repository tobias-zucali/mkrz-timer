export function normalizeHexColor(value: string) {
  const hex = value.replace(/^#/, "")

  if (hex.length === 3) {
    return hex
      .split("")
      .map((char) => char + char)
      .join("")
  }

  return hex
}

export function hexToRgbChannels(value: string) {
  const normalized = normalizeHexColor(value)

  if (!/^[\da-fA-F]{6}$/.test(normalized)) {
    return value
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)

  return `${red} ${green} ${blue}`
}
