;(() => {
  const DEFAULT_SYNC_PARAMS = {
    theme: "dark",
    pc: "#d61f69",
  }
  const MAX_TIMER_DURATION_SECONDS = 59999
  const FIRST_PAINT_THEME_DATASET_KEYS = {
    theme: "timerTheme",
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

  const resolveThemeAndPc = (searchString) => {
    const trimmedSearchString = searchString.replace(/^\?/, "")
    const searchParams = new URLSearchParams(trimmedSearchString)
    const theme = searchParams.get("theme") === "bright" ? "bright" : "dark"
    const version = searchParams.get("v")
    const rowsValue = searchParams.get("t")

    if (version !== "1" || !rowsValue) {
      return {
        theme,
        pc: DEFAULT_SYNC_PARAMS.pc,
      }
    }

    const rows = rowsValue
      .split("|")
      .map(parseRuntimeTimerRow)
      .filter((row) => row !== null)

    if (rows.length === 0) {
      return {
        theme,
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
      theme,
      pc: activeRowPrimaryColor || DEFAULT_SYNC_PARAMS.pc,
    }
  }

  const root = document.documentElement
  const resolved = resolveThemeAndPc(window.location.search)

  root.setAttribute("data-theme", resolved.theme)
  if (resolved.pc && resolved.pc !== DEFAULT_SYNC_PARAMS.pc) {
    root.style.setProperty("--color-primary", resolved.pc)
  }
  root.dataset[FIRST_PAINT_THEME_DATASET_KEYS.theme] = resolved.theme
  root.dataset[FIRST_PAINT_THEME_DATASET_KEYS.pc] =
    resolved.pc || DEFAULT_SYNC_PARAMS.pc
})()
