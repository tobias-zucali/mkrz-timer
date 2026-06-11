;(() => {
  const DEFAULT_SYNC_PARAMS = {
    bg: "#000000",
    fg: "#ffffff",
    pc: "#d61f69",
  }
  const MAX_TIMER_DURATION_SECONDS = 59999
  const FIRST_PAINT_THEME_DATASET_KEYS = {
    bg: "timerBg",
    fg: "timerFg",
    pc: "timerPc",
  }
  const HEX_COLOR_PATTERN = /^#?[0-9a-fA-F]{6}$/
  const DIGITS_ONLY_PATTERN = /^\d+$/

  const normalizeRuntimeColor = (value, fallback) => {
    if (!value || !HEX_COLOR_PATTERN.test(value)) {
      return fallback
    }

    return `#${value.replace(/^#/, "").toLowerCase()}`
  }

  const normalizeRuntimeOptionalColor = (value) => {
    if (value === "") {
      return ""
    }

    return normalizeRuntimeColor(value, "")
  }

  const parseRuntimeTimerRow = (value) => {
    const parts = value.split("!")

    if (parts.length !== 4 && parts.length !== 5) {
      return null
    }

    const [secondsValue, colorValue, encodedTitle, fourthValue, fifthValue] =
      parts
    if (!DIGITS_ONLY_PATTERN.test(secondsValue)) {
      return null
    }

    const totalSeconds = Number.parseInt(secondsValue, 10)
    if (totalSeconds < 0 || totalSeconds > MAX_TIMER_DURATION_SECONDS) {
      return null
    }

    try {
      decodeURIComponent(encodedTitle)
    } catch {
      return null
    }

    const primaryColor = normalizeRuntimeOptionalColor(colorValue)
    if (colorValue !== "" && !primaryColor) {
      return null
    }

    if (parts.length === 4) {
      return fourthValue === "0" || fourthValue === "1" ? primaryColor : null
    }

    if (
      !DIGITS_ONLY_PATTERN.test(fourthValue) ||
      Number.parseInt(fourthValue, 10) < 1 ||
      Number.parseInt(fourthValue, 10) > 99
    ) {
      return null
    }

    return fifthValue === "0" || fifthValue === "1" ? primaryColor : null
  }

  const resolveColors = (searchString) => {
    const trimmedSearchString = searchString.replace(/^\?/, "")
    const searchParams = new URLSearchParams(trimmedSearchString)
    const bg = normalizeRuntimeColor(
      searchParams.get("bg"),
      DEFAULT_SYNC_PARAMS.bg,
    )
    const fg = normalizeRuntimeColor(
      searchParams.get("fg"),
      DEFAULT_SYNC_PARAMS.fg,
    )
    const version = searchParams.get("v")
    const rowsValue = searchParams.get("t")

    if (version !== "1" || !rowsValue) {
      return {
        bg,
        fg,
        pc: DEFAULT_SYNC_PARAMS.pc,
      }
    }

    const rows = rowsValue
      .split("|")
      .map(parseRuntimeTimerRow)
      .filter((row) => row !== null)

    if (rows.length === 0) {
      return {
        bg,
        fg,
        pc: DEFAULT_SYNC_PARAMS.pc,
      }
    }

    const activeIndexValue = searchParams.get("a")
    const parsedActiveIndex =
      activeIndexValue && DIGITS_ONLY_PATTERN.test(activeIndexValue)
        ? Number.parseInt(activeIndexValue, 10)
        : 0
    const activeIndex = Math.min(
      Math.max(parsedActiveIndex, 0),
      rows.length - 1,
    )
    const activeRowPrimaryColor = rows[activeIndex] ?? ""

    return {
      bg,
      fg,
      pc: activeRowPrimaryColor || DEFAULT_SYNC_PARAMS.pc,
    }
  }

  const hexToRgbChannels = (value) => {
    const normalized = value.replace(/^#/, "")
    if (!/^[\da-fA-F]{6}$/.test(normalized)) {
      return value
    }

    const red = Number.parseInt(normalized.slice(0, 2), 16)
    const green = Number.parseInt(normalized.slice(2, 4), 16)
    const blue = Number.parseInt(normalized.slice(4, 6), 16)

    return `${red} ${green} ${blue}`
  }

  const root = document.documentElement
  const colors = resolveColors(window.location.search)

  root.style.setProperty("--background", hexToRgbChannels(colors.bg))
  root.style.setProperty("--foreground", hexToRgbChannels(colors.fg))
  root.style.setProperty("--primary", hexToRgbChannels(colors.pc))
  root.dataset[FIRST_PAINT_THEME_DATASET_KEYS.bg] =
    colors.bg || DEFAULT_SYNC_PARAMS.bg
  root.dataset[FIRST_PAINT_THEME_DATASET_KEYS.fg] =
    colors.fg || DEFAULT_SYNC_PARAMS.fg
  root.dataset[FIRST_PAINT_THEME_DATASET_KEYS.pc] =
    colors.pc || DEFAULT_SYNC_PARAMS.pc
})()
